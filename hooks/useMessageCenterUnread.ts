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
    // #region agent log
    try {
      const { data: views, error } = await supabase
        .from("notification_views")
        .select("item_type, item_id")
        .eq("user_id", user.id);
      if (error) {
        fetch('http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9b773e'},body:JSON.stringify({sessionId:'9b773e',location:'useMessageCenterUnread.ts:notification_views',message:'notification_views query failed',data:{error:error.message,code:error.code},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
      }
      if (!error && views) views.forEach((v) => seen.add(`${v.item_type}-${v.item_id}`));
    } catch (e) {
      fetch('http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9b773e'},body:JSON.stringify({sessionId:'9b773e',location:'useMessageCenterUnread.ts:notification_views_catch',message:'notification_views exception',data:{err:String(e)},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion

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
