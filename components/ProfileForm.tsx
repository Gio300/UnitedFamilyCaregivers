"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm() {
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setFullName(data?.full_name ?? user.user_metadata?.full_name ?? "");
    }
    load();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      });
      await supabase.from("activity_log").insert({
        user_id: user.id,
        client_id: null,
        action_type: "profile_updated",
        details: { full_name: fullName },
      });
      setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-1">
          Full name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save"}
      </button>
      {saved && <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>}
    </form>
  );
}
