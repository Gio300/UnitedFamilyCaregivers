"use client";

import { useState, useEffect } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { fetchLiveKitToken } from "@/lib/livekit";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
const ROOM_NAME = "ufc-support";

export default function CallsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [extracted, setExtracted] = useState<{
    call_reason: string | null;
    disposition: string | null;
    notes: string | null;
  } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getToken() {
      const { data: { session } } = await supabase.auth.getSession();
      const apiBase = getApiBase();
      if (!session || !apiBase || !LIVEKIT_URL) {
        setError(!LIVEKIT_URL ? "LiveKit URL not configured" : "Please sign in");
        return;
      }
      try {
        const t = await fetchLiveKitToken(ROOM_NAME, session.access_token, apiBase);
        setToken(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to get token");
      }
    }
    getToken();
  }, [supabase.auth]);

  async function extractNotes() {
    if (!notesText.trim()) return;
    setExtracting(true);
    setExtracted(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiBase = getApiBase();
      if (!session || !apiBase) throw new Error("Not signed in or API not configured");
      const res = await fetch(`${apiBase}/api/notes/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: notesText }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setExtracted(data);
    } catch (e) {
      setExtracted({
        call_reason: null,
        disposition: null,
        notes: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setExtracting(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Calls</h1>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Calls</h1>
        <p className="text-zinc-500">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Calls</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Join the support room for voice calls. Use the notes extractor below to process call transcripts.
      </p>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="font-medium mb-2">Voice room</h2>
        <LiveKitRoom
          token={token}
          serverUrl={LIVEKIT_URL}
          connect={true}
          audio={true}
          video={false}
          className="rounded-lg overflow-hidden min-h-[120px]"
        >
          <RoomAudioRenderer />
          <p className="text-sm text-zinc-500 py-2">You are in the room. Use your microphone to speak.</p>
        </LiveKitRoom>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="font-medium mb-2">Extract call note</h2>
        <p className="text-sm text-zinc-500 mb-2">Paste call transcript to extract structured fields.</p>
        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Paste call transcript here..."
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm min-h-[100px]"
        />
        <button
          onClick={extractNotes}
          disabled={extracting || !notesText.trim()}
          className="mt-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {extracting ? "Extracting..." : "Extract"}
        </button>
        {extracted && (
          <div className="mt-4 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm space-y-1">
            <p><strong>Reason:</strong> {extracted.call_reason ?? "—"}</p>
            <p><strong>Disposition:</strong> {extracted.disposition ?? "—"}</p>
            <p><strong>Notes:</strong> {extracted.notes ?? "—"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
