"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, ConnectionState, RoomEvent } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { fetchLiveKitToken, supportQueueAbandon, supportQueueEnqueue } from "@/lib/livekit";
import { useApp, type AccentColor } from "@/context/AppContext";

function accentPrimary(accent: AccentColor) {
  switch (accent) {
    case "blue":
      return "bg-blue-600 hover:bg-blue-700 text-white";
    case "violet":
      return "bg-violet-600 hover:bg-violet-700 text-white";
    case "amber":
      return "bg-amber-600 hover:bg-amber-700 text-white";
    default:
      return "bg-emerald-600 hover:bg-emerald-700 text-white";
  }
}

function countRemoteParticipants(room: Room): number {
  return room.remoteParticipants.size;
}

/** LiveKit Agents publish synchronized captions on this topic (see @livekit/agents TOPIC_TRANSCRIPTION). */
const LIVEKIT_TRANSCRIPTION_TOPIC = "lk.transcription";

const COMPANION_VOICE_WELCOME =
  "You are on hold for a customer service agent. While you wait, this Companion can show tips and collect details for your representative. Sharing information here does not remove you from the queue. When you are ready, speak with the voice assistant or use the main chat below.";

export function CustomerSupportVoicePanel({
  onAgentSpeech,
  embedded,
}: {
  onAgentSpeech?: (text: string) => void;
  embedded?: boolean;
}) {
  const {
    accentColor,
    markIvrSessionUnresolved,
    resetIvrSessionUnresolved,
    setCompanionVoiceSessionActive,
    pushCompanionGuidance,
    setActiveSupportRoomName,
  } = useApp();
  const supabase = createClient();
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roomLabel, setRoomLabel] = useState<string | null>(null);
  const [remoteCount, setRemoteCount] = useState(0);
  const [roomStatusBusy, setRoomStatusBusy] = useState(false);
  const [roomStatusText, setRoomStatusText] = useState<string | null>(null);
  const [userOnHold, setUserOnHold] = useState(false);
  const [localMicOn, setLocalMicOn] = useState(true);
  const preHoldMicEnabledRef = useRef(true);
  const roomLabelRef = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    const label = roomLabelRef.current;
    const r = roomRef.current;
    if (r) {
      try {
        r.unregisterTextStreamHandler(LIVEKIT_TRANSCRIPTION_TOPIC);
      } catch {
        /* ignore */
      }
      r.disconnect();
      roomRef.current = null;
    }
    roomLabelRef.current = null;
    setRoomLabel(null);
    setRemoteCount(0);
    setRoomStatusText(null);
    setUserOnHold(false);
    setLocalMicOn(true);
    setState(ConnectionState.Disconnected);
    setCompanionVoiceSessionActive(false);
    setActiveSupportRoomName(null);
    resetIvrSessionUnresolved();
    if (label) {
      void (async () => {
        const apiBase = getApiBase();
        if (!apiBase) return;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (jwt) {
          try {
            await supportQueueAbandon(label, jwt, apiBase);
          } catch {
            /* ignore */
          }
        }
      })();
    }
  }, [resetIvrSessionUnresolved, setCompanionVoiceSessionActive, setActiveSupportRoomName, supabase]);

  useEffect(() => () => disconnect(), [disconnect]);

  const startVoice = async () => {
    setError(null);
    const apiBase = getApiBase();
    const serverUrl = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LIVEKIT_URL || "" : "";
    if (!apiBase || !serverUrl) {
      setError("Set NEXT_PUBLIC_API_BASE and NEXT_PUBLIC_LIVEKIT_URL.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt || !session?.user?.id) {
      setError("Sign in required.");
      return;
    }
    setBusy(true);
    try {
      disconnect();
      const roomName = `cs-voice-${session.user.id}-${Date.now()}`;
      const token = await fetchLiveKitToken(roomName, jwt, apiBase);
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const syncRemote = () => setRemoteCount(countRemoteParticipants(room));

      room.on(RoomEvent.ConnectionStateChanged, () => setState(room.state));
      room.on(RoomEvent.ParticipantConnected, syncRemote);
      room.on(RoomEvent.ParticipantDisconnected, syncRemote);

      room.registerTextStreamHandler(LIVEKIT_TRANSCRIPTION_TOPIC, async (reader, participantInfo) => {
        if (participantInfo.identity === room.localParticipant.identity) {
          return;
        }
        try {
          const text = (await reader.readAll()).trim();
          if (text) {
            onAgentSpeech?.(text);
          }
        } catch {
          /* stream cancelled or failed */
        }
      });

      setState(ConnectionState.Connecting);
      await room.connect(serverUrl, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setLocalMicOn(true);
      await room.localParticipant.setCameraEnabled(false);
      try {
        await room.startAudio();
      } catch {
        /* autoplay may still work after getUserMedia */
      }
      syncRemote();
      roomLabelRef.current = roomName;
      setRoomLabel(roomName);
      setActiveSupportRoomName(roomName);
      setCompanionVoiceSessionActive(true);
      try {
        await supportQueueEnqueue(roomName, jwt, apiBase);
      } catch (enqErr) {
        console.warn("support queue enqueue:", enqErr);
      }
      if (embedded) {
        pushCompanionGuidance(COMPANION_VOICE_WELCOME);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect");
      disconnect();
    } finally {
      setBusy(false);
    }
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room || userOnHold) return;
    const mic = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!mic);
    setLocalMicOn(room.localParticipant.isMicrophoneEnabled);
  };

  const toggleHold = async () => {
    const room = roomRef.current;
    if (!room) return;
    if (!userOnHold) {
      preHoldMicEnabledRef.current = room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(false);
      setLocalMicOn(false);
      setUserOnHold(true);
    } else {
      setUserOnHold(false);
      await room.localParticipant.setMicrophoneEnabled(preHoldMicEnabledRef.current);
      setLocalMicOn(preHoldMicEnabledRef.current);
    }
  };

  const checkRoomViaApi = async () => {
    if (!roomLabel) return;
    const apiBase = getApiBase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) {
      setRoomStatusText("Sign in required for room status.");
      return;
    }
    setRoomStatusBusy(true);
    setRoomStatusText(null);
    try {
      const base = apiBase.replace(/\/+$/, "");
      const url = `${base}/api/livekit/room-status?roomName=${encodeURIComponent(roomLabel)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRoomStatusText(
          typeof body.error === "string" ? body.error : `HTTP ${res.status}`
        );
        return;
      }
      const s = body.summary;
      const line =
        s && typeof s.interpretation === "string"
          ? s.interpretation
          : JSON.stringify(body, null, 2);
      setRoomStatusText(
        `${line}\n\n${JSON.stringify(body.participants, null, 2)}`
      );
    } catch (e) {
      setRoomStatusText(e instanceof Error ? e.message : "Request failed");
    } finally {
      setRoomStatusBusy(false);
    }
  };

  const connected = state === ConnectionState.Connected;

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 space-y-3 ${
        embedded ? "p-3" : "p-4"
      }`}
    >
      <h2 className={`font-semibold text-slate-900 dark:text-white ${embedded ? "text-base" : "text-lg"}`}>
        {embedded ? "United Family Caregivers" : "Voice (LiveKit)"}
      </h2>
      {embedded ? (
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Get in queue to speak with a customer service agent now.
        </p>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The AI joins as a second participant. Keep{" "}
          <code className="text-xs bg-slate-100 dark:bg-zinc-800 px-1 rounded">livekit-voice-agent</code> running (
          <code className="text-xs bg-slate-100 dark:bg-zinc-800 px-1 rounded">npm run dev</code>
          ) in <code className="text-xs bg-slate-100 dark:bg-zinc-800 px-1 rounded">livekit-voice-agent/</code>.
        </p>
      )}

      {connected && (
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={toggleHold}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              userOnHold
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
            }`}
          >
            {userOnHold ? "Resume" : "Hold"}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            disabled={userOnHold}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {userOnHold ? "Muted (hold)" : localMicOn ? "Mute" : "Unmute"}
          </button>
          <button
            type="button"
            onClick={disconnect}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white ml-auto"
          >
            Leave session
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500">Status: {state}</p>
      {connected && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Others in room (incl. AI): <span className="font-medium text-slate-800 dark:text-slate-200">{remoteCount}</span>
          {remoteCount === 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {" "}
              — start the voice agent worker, then wait a few seconds or leave and start again.
            </span>
          )}
        </p>
      )}
      {userOnHold && embedded && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          You are on hold from the app: your mic is muted. The voice assistant may still play hold messaging or music
          depending on setup. Tell the assistant anything you want your representative to know — we will document that
          in Companion when the worker supports it.
        </p>
      )}
      {roomLabel && (
        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">Room: {roomLabel}</p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!connected ? (
        <button
          type="button"
          disabled={busy}
          onClick={startVoice}
          className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${accentPrimary(accentColor)}`}
        >
          {busy ? "Connecting…" : embedded ? "Connect Now" : "Start voice session"}
        </button>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            disabled={roomStatusBusy || !roomLabel}
            onClick={checkRoomViaApi}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-600 disabled:opacity-50"
          >
            {roomStatusBusy ? "Checking…" : "Check LiveKit room (API)"}
          </button>
          {embedded && (
            <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                Still stuck after talking with the voice assistant? Say so here — if no live agent can pick up, Companion
                can open the scheduler for a call-back (same as Schedule a call).
              </p>
              <button
                type="button"
                onClick={() => markIvrSessionUnresolved()}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-zinc-600 hover:bg-slate-200 dark:hover:bg-zinc-700"
              >
                Voice did not solve my issue
              </button>
            </div>
          )}
        </div>
      )}

      {roomStatusText && (
        <pre className="text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-slate-800 dark:text-slate-200 max-h-64 overflow-y-auto">
          {roomStatusText}
        </pre>
      )}
    </div>
  );
}
