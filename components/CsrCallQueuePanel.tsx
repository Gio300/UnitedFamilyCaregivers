"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { fetchLiveKitCsrToken } from "@/lib/livekit";
import { DmLiveKitModal } from "@/components/DmLiveKitModal";
import { TelephonyOutboundControls } from "@/components/TelephonyOutboundControls";

type QueueRow = {
  id: string;
  room_name: string;
  caller_user_id: string;
  status: string;
  created_at: string;
  expires_at: string;
};

export function CsrCallQueuePanel() {
  const supabase = createClient();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceToken, setVoiceToken] = useState("");
  const [voiceRoom, setVoiceRoom] = useState("");
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      setErr("Set NEXT_PUBLIC_API_BASE");
      setLoading(false);
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) {
      setErr("Sign in required");
      setLoading(false);
      return;
    }
    const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/support-queue/waiting`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const body = (await res.json().catch(() => ({}))) as { rows?: QueueRow[]; error?: string };
    if (!res.ok) {
      setErr(typeof body.error === "string" ? body.error : `HTTP ${res.status}`);
      setRows([]);
    } else {
      setErr(null);
      setRows(body.rows || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, [load]);

  const accept = async (row: QueueRow) => {
    const apiBase = getApiBase();
    const serverUrl = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LIVEKIT_URL || "" : "";
    if (!apiBase || !serverUrl) {
      setErr("API base or LiveKit URL missing");
      return;
    }
    setBusyId(row.id);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) throw new Error("Sign in required");
      const base = apiBase.replace(/\/+$/, "");
      const claimRes = await fetch(`${base}/api/support-queue/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ id: row.id }),
      });
      const claimBody = await claimRes.json().catch(() => ({}));
      if (!claimRes.ok) {
        throw new Error(typeof claimBody.error === "string" ? claimBody.error : "Claim failed");
      }
      const token = await fetchLiveKitCsrToken(row.room_name, jwt, apiBase);
      setActiveQueueId(row.id);
      setVoiceToken(token);
      setVoiceRoom(row.room_name);
      setVoiceOpen(true);
      void load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Accept failed");
    } finally {
      setBusyId(null);
    }
  };

  const closeVoice = async () => {
    setVoiceOpen(false);
    setVoiceToken("");
    setVoiceRoom("");
    const qid = activeQueueId;
    setActiveQueueId(null);
    if (qid) {
      const apiBase = getApiBase();
      if (apiBase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (jwt) {
          await fetch(`${apiBase.replace(/\/+$/, "")}/api/support-queue/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ id: qid }),
          });
        }
      }
    }
    void load();
  };

  return (
    <div className="text-sm text-slate-700 dark:text-slate-300 space-y-4">
      <p className="text-slate-600 dark:text-slate-400">
        Waiting callers (voice). Accept to join their LiveKit room with the caller and Kloudy. Queue entries expire
        after about five minutes.
      </p>
      {loading && <p className="text-slate-500">Loading queue…</p>}
      {err && <p className="text-red-600 dark:text-red-400 text-xs">{err}</p>}
      {!loading && rows.length === 0 && !err && (
        <p className="text-slate-500 dark:text-slate-400">No calls waiting.</p>
      )}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-zinc-600 p-3 bg-slate-50 dark:bg-zinc-800/50"
          >
            <div className="text-xs font-mono break-all text-slate-600 dark:text-slate-400">{r.room_name}</div>
            <div className="text-xs text-slate-500">Caller user id: {r.caller_user_id.slice(0, 8)}…</div>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => void accept(r)}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {busyId === r.id ? "Connecting…" : "Accept call"}
            </button>
          </li>
        ))}
      </ul>

      <div className="pt-2 border-t border-slate-200 dark:border-zinc-600">
        <TelephonyOutboundControls />
      </div>

      <DmLiveKitModal
        open={voiceOpen}
        onClose={() => void closeVoice()}
        serverUrl={typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LIVEKIT_URL || "" : ""}
        token={voiceToken}
        roomLabel={voiceRoom}
      />
    </div>
  );
}
