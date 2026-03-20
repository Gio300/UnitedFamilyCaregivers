"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface NotesOnWhatHappenedBarProps {
  clientId: string | null;
  userId: string | null;
}

export function NotesOnWhatHappenedBar({ clientId, userId }: NotesOnWhatHappenedBarProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const handleSubmit = async () => {
    const text = value.trim();
    if (!text || !userId || saving) return;

    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase.from("call_notes").insert({
        user_id: userId,
        client_id: clientId || null,
        call_reason: "Quick note",
        disposition: "Noted",
        notes: text,
      });

      if (error) throw error;
      setValue("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Notes on what happened..."
        disabled={!userId || saving}
        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm placeholder:text-slate-400 disabled:opacity-50"
        aria-label="Notes on what happened"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim() || !userId || saving}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
