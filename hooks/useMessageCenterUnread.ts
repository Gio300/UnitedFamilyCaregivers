"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/** Poll when tab visible only; 2 min interval to reduce Supabase Disk IO from idle tabs. */
const POLL_MS = 120_000;

export function useMessageCenterUnread() {
  const [count, setCount] = useState(0);
  const supabase = createClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCount(0);
      return;
    }

    const seen = new Set<string>();
    try {
      const { data: views, error } = await supabase
        .from("notification_views")
        .select("item_type, item_id")
        .eq("user_id", user.id);
      if (!error && views) views.forEach((v) => seen.add(`${v.item_type}-${v.item_id}`));
    } catch {
      /* ignore */
    }

    let total = 0;
    const add = (type: string, data: { id: string }[]) => {
      (data || []).forEach((r) => {
        if (!seen.has(`${type}-${r.id}`)) total++;
      });
    };

    try {
      let remindersData: { id: string }[] | null = null;
      const r1 = await supabase
        .from("reminders")
        .select("id")
        .eq("target_user_id", user.id)
        .eq("status", "pending")
        .limit(100);
      if (!r1.error) remindersData = r1.data;
      else {
        const r2 = await supabase.from("reminders").select("id").eq("user_id", user.id).limit(100);
        if (!r2.error) remindersData = r2.data;
      }
      add("reminder", remindersData || []);
    } catch {
      /* ignore */
    }

    try {
      const { data, error } = await supabase.from("call_notes").select("id").eq("user_id", user.id).limit(100);
      if (!error) add("call_note", data || []);
    } catch {
      /* ignore */
    }
    try {
      const { data, error } = await supabase.from("incoming_emails").select("id").limit(100);
      if (!error) add("incoming_email", data || []);
    } catch {
      /* ignore */
    }
    try {
      const { data, error } = await supabase.from("sent_messages").select("id").limit(100);
      if (!error) add("sent_message", data || []);
    } catch {
      /* ignore */
    }
    try {
      const { data, error } = await supabase.from("activity_log").select("id").eq("user_id", user.id).limit(100);
      if (!error) add("activity", data || []);
    } catch {
      /* ignore */
    }

    setCount(total);
  }, [supabase]);

  const clearPoll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPollIfVisible = useCallback(() => {
    clearPoll();
    if (typeof document === "undefined" || document.visibilityState !== "visible") return;
    intervalRef.current = setInterval(refresh, POLL_MS);
  }, [clearPoll, refresh]);

  useEffect(() => {
    refresh();
    startPollIfVisible();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        refresh();
        startPollIfVisible();
      } else {
        clearPoll();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearPoll();
    };
  }, [refresh, startPollIfVisible, clearPoll]);

  return { count, refresh };
}
