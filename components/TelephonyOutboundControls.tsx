"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { fetchLiveKitToken } from "@/lib/livekit";
import { DmLiveKitModal } from "@/components/DmLiveKitModal";

const LINE_LABELS: Record<string, string> = {
  ufc833: "UFC 833",
  ufc800: "UFC 800",
  nv_medicaid: "NV Medicaid",
};

function lineButtonLabel(key: string) {
  return LINE_LABELS[key] || key;
}

export function TelephonyOutboundControls({ className }: { className?: string }) {
  const supabase = createClient();
  const [lines, setLines] = useState<string[]>([]);
  const [trunkOk, setTrunkOk] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [outBusy, setOutBusy] = useState<string | null>(null);
  const [dialErr, setDialErr] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceToken, setVoiceToken] = useState("");
  const [voiceRoom, setVoiceRoom] = useState("");

  const loadLines = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      setLoadErr("Set NEXT_PUBLIC_API_BASE");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) {
      setLoadErr("Sign in required");
      return;
    }
    const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/telephony/lines`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const body = (await res.json().catch(() => ({}))) as {
      lines?: string[];
      configured?: boolean;
      error?: string;
    };
    if (!res.ok) {
      setLoadErr(typeof body.error === "string" ? body.error : `HTTP ${res.status}`);
      setLines([]);
      return;
    }
    setLoadErr(null);
    setLines(body.lines || []);
    setTrunkOk(!!body.configured);
  }, [supabase]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  const closeVoice = () => {
    setVoiceOpen(false);
    setVoiceToken("");
    setVoiceRoom("");
  };

  const dialOutbound = async (line: string) => {
    const apiBase = getApiBase();
    const serverUrl = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LIVEKIT_URL || "" : "";
    if (!apiBase || !serverUrl) {
      setDialErr("API base or LiveKit URL missing");
      return;
    }
    setOutBusy(line);
    setDialErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) throw new Error("Sign in required");
      const base = apiBase.replace(/\/+$/, "");
      const res = await fetch(`${base}/api/telephony/outbound`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ line }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Outbound failed");
      }
      const roomName = typeof body.roomName === "string" ? body.roomName : "";
      if (!roomName) throw new Error("No room from gateway");
      const token = await fetchLiveKitToken(roomName, jwt, apiBase);
      setVoiceToken(token);
      setVoiceRoom(roomName);
      setVoiceOpen(true);
    } catch (e) {
      setDialErr(e instanceof Error ? e.message : "Outbound failed");
    } finally {
      setOutBusy(null);
    }
  };

  if (loadErr && lines.length === 0) {
    return <p className="text-xs text-red-600 dark:text-red-400">{loadErr}</p>;
  }

  return (
    <div className={className}>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
        Approved outbound (SIP trunk required)
        {!trunkOk && lines.length > 0 ? (
          <span className="text-amber-600 dark:text-amber-400 ml-1">— trunk not configured on gateway</span>
        ) : null}
      </p>
      {dialErr && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{dialErr}</p>}
      <div className="flex flex-wrap gap-2">
        {lines.map((key) => (
          <button
            key={key}
            type="button"
            disabled={!!outBusy}
            onClick={() => void dialOutbound(key)}
            className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white text-xs font-medium disabled:opacity-50"
          >
            {outBusy === key ? "Dialing…" : lineButtonLabel(key)}
          </button>
        ))}
      </div>
      <DmLiveKitModal
        open={voiceOpen}
        onClose={closeVoice}
        serverUrl={typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LIVEKIT_URL || "" : ""}
        token={voiceToken}
        roomLabel={voiceRoom}
      />
    </div>
  );
}
