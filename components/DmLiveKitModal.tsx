"use client";

import { useEffect, useRef, useState } from "react";
import { Room, ConnectionState, RoomEvent } from "livekit-client";

type Props = {
  open: boolean;
  onClose: () => void;
  serverUrl: string;
  token: string;
  roomLabel: string;
};

export function DmLiveKitModal({ open, onClose, serverUrl, token, roomLabel }: Props) {
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !serverUrl || !token) return;

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const onConn = () => setState(room.state);
    room.on(RoomEvent.ConnectionStateChanged, onConn);

    setError(null);
    setState(ConnectionState.Connecting);

    room
      .connect(serverUrl, token)
      .then(async () => {
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(false);
      })
      .catch((e: Error) => {
        setError(e.message || "Could not connect");
        setState(ConnectionState.Disconnected);
      });

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onConn);
      room.disconnect();
      roomRef.current = null;
    };
  }, [open, serverUrl, token]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Voice (LiveKit)</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{roomLabel}</p>
        <p className="text-xs text-slate-500">Room: {state}</p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <p className="text-xs text-slate-500">
          Microphone is enabled when connected. The other party must join the same room name with their own token.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white text-sm font-medium"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
