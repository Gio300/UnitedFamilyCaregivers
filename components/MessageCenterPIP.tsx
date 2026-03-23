"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type MessageCenterItem =
  | { type: "reminder"; id: string; data: { text: string; remind_at: string; client_id?: string } }
  | { type: "call_note"; id: string; data: { call_reason?: string; disposition?: string; notes?: string; created_at: string; client_id?: string } }
  | { type: "incoming_email"; id: string; data: { from_email: string; subject?: string; body?: string; received_at: string; client_id?: string } }
  | { type: "sent_message"; id: string; data: { recipient_email: string; subject?: string; body?: string; sent_at: string; client_id: string } }
  | { type: "activity"; id: string; data: { action_type: string; details?: Record<string, unknown> | string; created_at: string; client_id?: string } }
  | { type: "appointment"; id: string; data: { title: string; start_at: string; status: string; client_id?: string; caregiver_id?: string } };

export function MessageCenterPIP({ onClose, embedded }: { onClose: () => void; embedded?: boolean }) {
  const [items, setItems] = useState<MessageCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedItem, setSelectedItem] = useState<MessageCenterItem | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const itemKey = (item: MessageCenterItem) => `${item.type}-${item.id}`;

  const getDate = (item: MessageCenterItem): string => {
    const d = item.data as Record<string, unknown>;
    return (d.remind_at || d.created_at || d.received_at || d.sent_at || d.start_at || "") as string;
  };

  const fetchItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uid = user.id;

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [remindersRes, callNotesRes, incomingRes, sentRes, activityRes, viewsRes, apptsRes] = await Promise.all([
      supabase
        .from("reminders")
        .select("id, text, remind_at, client_id")
        .eq("target_user_id", uid)
        .eq("status", "pending")
        .order("remind_at", { ascending: true })
        .limit(50),
      supabase
        .from("call_notes")
        .select("id, call_reason, disposition, notes, created_at, client_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("incoming_emails")
        .select("id, from_email, subject, body, received_at, client_id")
        .order("received_at", { ascending: false })
        .limit(20),
      supabase
        .from("sent_messages")
        .select("id, recipient_email, subject, body, sent_at, client_id")
        .order("sent_at", { ascending: false })
        .limit(20),
      supabase
        .from("activity_log")
        .select("id, action_type, details, created_at, client_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notification_views")
        .select("item_type, item_id")
        .eq("user_id", uid),
      (async () => {
        const { data: asCaregiver } = await supabase
          .from("appointments")
          .select("id, title, start_at, status, client_id, caregiver_id")
          .eq("caregiver_id", uid)
          .gte("start_at", now.toISOString())
          .lte("start_at", in24h.toISOString())
          .in("status", ["scheduled", "confirmed"])
          .order("start_at", { ascending: true })
          .limit(10);
        const { data: myClientProfiles } = await supabase.from("client_profiles").select("id").eq("user_id", uid);
        const myClientIds = myClientProfiles?.map((c) => c.id) || [];
        let asClient: unknown[] = [];
        if (myClientIds.length > 0) {
          const { data } = await supabase
            .from("appointments")
            .select("id, title, start_at, status, client_id, caregiver_id")
            .in("client_id", myClientIds)
            .gte("start_at", now.toISOString())
            .lte("start_at", in24h.toISOString())
            .in("status", ["scheduled", "confirmed"])
            .order("start_at", { ascending: true })
            .limit(10);
          asClient = data || [];
        }
        const merged = ([...(asCaregiver || []), ...asClient] as { start_at: string }[]).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()).slice(0, 20);
        return { data: merged };
      })(),
    ]);

    const seen = new Set((viewsRes.data || []).map((v) => `${v.item_type}-${v.item_id}`));
    setSeenIds(seen);

    const combined: MessageCenterItem[] = [];

    (remindersRes.data || []).forEach((r) => {
      combined.push({ type: "reminder", id: r.id, data: r });
    });
    (callNotesRes.data || []).forEach((c) => {
      combined.push({ type: "call_note", id: c.id, data: c });
    });
    (incomingRes.data || []).forEach((e) => {
      combined.push({ type: "incoming_email", id: e.id, data: e });
    });
    (sentRes.data || []).forEach((s) => {
      combined.push({ type: "sent_message", id: s.id, data: s });
    });
    (activityRes.data || []).forEach((a) => {
      combined.push({ type: "activity", id: a.id, data: a });
    });
    (((apptsRes as { data?: unknown[] })?.data || []) as { id: string; title: string; start_at: string; status: string; client_id?: string; caregiver_id?: string }[]).forEach((a) => {
      combined.push({ type: "appointment", id: a.id, data: a });
    });

    combined.sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime());

    setItems(combined);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const markSeen = async (item: MessageCenterItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const key = itemKey(item);
    await supabase.from("notification_views").upsert(
      { user_id: user.id, item_type: item.type, item_id: item.id },
      { onConflict: "user_id,item_type,item_id" }
    );
    setSeenIds((prev) => new Set([...prev, key]));
  };

  const handleSelect = (item: MessageCenterItem) => {
    setSelectedItem(item);
    setView("detail");
    markSeen(item);
  };

  const unreadCount = items.filter((i) => !seenIds.has(itemKey(i))).length;

  const formatDate = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    const diff = now.getTime() - dt.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return dt.toLocaleDateString();
  };

  const typeLabel = (t: string) =>
    ({ reminder: "Reminder", call_note: "Call", incoming_email: "Email", sent_message: "Sent", activity: "Activity", appointment: "Appointment" }[t] || t);

  const inner = (
    <div
      className={embedded ? "flex flex-col flex-1 min-h-0" : "w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl"}
      onClick={embedded ? undefined : (e) => e.stopPropagation()}
    >
      {(!embedded || view === "detail") && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-zinc-700 shrink-0">
          {!embedded && (
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Message Center
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </h2>
          )}
          <div className={`flex items-center gap-1 ${embedded ? "w-full justify-end" : ""}`}>
            {view === "detail" && (
              <button
                type="button"
                onClick={() => { setView("list"); setSelectedItem(null); }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700"
                aria-label="Back"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={fetchItems}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700"
              aria-label="Refresh"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            {!embedded && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${embedded ? "p-4" : "p-4"}`}>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : view === "detail" && selectedItem ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">{typeLabel(selectedItem.type)}</div>
              {selectedItem.type === "reminder" && (
                <>
                  <p className="text-slate-900 dark:text-white">{selectedItem.data.text}</p>
                  <p className="text-xs text-slate-500">Due: {formatDate(selectedItem.data.remind_at)}</p>
                </>
              )}
              {selectedItem.type === "call_note" && (
                <>
                  <p className="text-slate-700 dark:text-slate-300">{selectedItem.data.call_reason || "Call"}</p>
                  <p className="text-sm">{selectedItem.data.disposition || selectedItem.data.notes || "—"}</p>
                  <p className="text-xs text-slate-500">{formatDate(selectedItem.data.created_at)}</p>
                </>
              )}
              {selectedItem.type === "incoming_email" && (
                <>
                  <p className="font-medium text-slate-900 dark:text-white">From: {selectedItem.data.from_email}</p>
                  <p className="text-sm">{selectedItem.data.subject || "(no subject)"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-6">{selectedItem.data.body || "—"}</p>
                  <p className="text-xs text-slate-500">{formatDate(selectedItem.data.received_at)}</p>
                </>
              )}
              {selectedItem.type === "sent_message" && (
                <>
                  <p className="font-medium text-slate-900 dark:text-white">To: {selectedItem.data.recipient_email}</p>
                  <p className="text-sm">{selectedItem.data.subject || "(no subject)"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-6">{selectedItem.data.body || "—"}</p>
                  <p className="text-xs text-slate-500">{formatDate(selectedItem.data.sent_at)}</p>
                </>
              )}
              {selectedItem.type === "activity" && (
                <>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedItem.data.action_type}</p>
                  <p className="text-sm">
                    {selectedItem.data.details == null
                      ? "—"
                      : typeof selectedItem.data.details === "string"
                        ? selectedItem.data.details
                        : JSON.stringify(selectedItem.data.details)}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(selectedItem.data.created_at)}</p>
                </>
              )}
              {selectedItem.type === "appointment" && (
                <>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedItem.data.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(selectedItem.data.start_at).toLocaleString()} · {selectedItem.data.status}
                  </p>
                  <p className="text-xs text-slate-500">Scheduled appointment reminder</p>
                </>
              )}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet.</p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => {
                const key = itemKey(item);
                const isUnread = !seenIds.has(key);
                let preview = "";
                if (item.type === "reminder") preview = item.data.text?.slice(0, 60) || "Reminder";
                if (item.type === "call_note") preview = item.data.call_reason || item.data.notes?.slice(0, 40) || "Call note";
                if (item.type === "incoming_email") preview = `${item.data.from_email}: ${(item.data.subject || "").slice(0, 40)}`;
                if (item.type === "sent_message") preview = `To ${item.data.recipient_email}: ${(item.data.subject || "").slice(0, 40)}`;
                if (item.type === "activity")
                  preview = item.data.action_type || String(item.data.details || "").slice(0, 40) || "Activity";
                if (item.type === "appointment")
                  preview = item.data.title + " – " + new Date(item.data.start_at).toLocaleString();

                const date = getDate(item);

                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-start gap-2 ${
                        isUnread ? "bg-slate-50 dark:bg-zinc-800/50" : ""
                      }`}
                    >
                      <span className={`shrink-0 text-xs ${isUnread ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-500"}`}>
                        {typeLabel(item.type)}
                      </span>
                      <span className="flex-1 min-w-0 text-sm text-slate-900 dark:text-white truncate">{preview}</span>
                      <span className="shrink-0 text-xs text-slate-400">{formatDate(date)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
  );

  if (embedded) return inner;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      {inner}
    </div>
  );
}
