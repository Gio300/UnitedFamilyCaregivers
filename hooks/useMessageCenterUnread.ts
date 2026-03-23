"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useMessageCenterUnread() {
  const [count, setCount] = useState(0);
  const supabase = createClient();

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
      /* table may lack user_id or 500 - treat as empty */
    }

    let total = 0;
    const add = (type: string, data: { id: string }[]) => {
      (data || []).forEach((r) => {
        if (!seen.has(`${type}-${r.id}`)) total++;
      });
    };

    // Reminders: try target_user_id + status (schema_full); fallback to user_id (migration 001)
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

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { count, refresh };
}
