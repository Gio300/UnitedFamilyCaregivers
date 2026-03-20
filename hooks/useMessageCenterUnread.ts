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

    const [reminders, callNotes, incoming, sent, activity, views] = await Promise.all([
      supabase.from("reminders").select("id").eq("target_user_id", user.id).eq("status", "pending").limit(100),
      supabase.from("call_notes").select("id").eq("user_id", user.id).limit(100),
      supabase.from("incoming_emails").select("id").limit(100),
      supabase.from("sent_messages").select("id").limit(100),
      supabase.from("activity_log").select("id").eq("user_id", user.id).limit(100),
      supabase.from("notification_views").select("item_type, item_id").eq("user_id", user.id),
    ]);

    const seen = new Set((views.data || []).map((v) => `${v.item_type}-${v.item_id}`));
    let total = 0;
    const add = (type: string, data: { id: string }[]) => {
      (data || []).forEach((r) => { if (!seen.has(`${type}-${r.id}`)) total++; });
    };
    add("reminder", reminders.data || []);
    add("call_note", callNotes.data || []);
    add("incoming_email", incoming.data || []);
    add("sent_message", sent.data || []);
    add("activity", activity.data || []);

    setCount(total);
  }, [supabase]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { count, refresh };
}
