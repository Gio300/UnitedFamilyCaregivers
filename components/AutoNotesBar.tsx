"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { getApiBase } from "@/lib/api";

interface ActivityItem {
  id: string;
  action_type: string;
  details: Record<string, unknown> | null;
  noted_at: string | null;
  created_at: string;
}

interface AutoNotesBarProps {
  clientId: string | null;
  userId: string | null;
}

export function AutoNotesBar({ clientId, userId }: AutoNotesBarProps) {
  const { openPIP, autoNotesScope, setAutoNotesScope, currentSessionId, activityLogRefreshKey } = useApp();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const targetId = clientId || userId;

  useEffect(() => {
    if (!targetId) {
      setItems([]);
      return;
    }
    if (autoNotesScope === "this_chat" && !currentSessionId) {
      setItems([]);
      return;
    }
    let q = supabase
      .from("activity_log")
      .select("id, action_type, details, noted_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (clientId) {
      q = q.eq("client_id", clientId);
    } else {
      q = q.eq("user_id", targetId).is("client_id", null);
    }
    if (autoNotesScope === "this_chat" && currentSessionId) {
      q = q.eq("session_id", currentSessionId);
    }
    q.then(({ data }) => setItems(data || []));
  }, [targetId, clientId, supabase, autoNotesScope, currentSessionId, activityLogRefreshKey]);

  const handleReview = () => {
    openPIP("activity", {
      title: `${items.length} Activities`,
      content: (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {items.map((a) => (
            <div key={a.id} className="p-2 rounded border border-slate-200 dark:border-slate-600 text-sm">
              <div className="font-medium">{a.action_type}</div>
              {a.details && <pre className="text-xs mt-1 overflow-x-auto">{JSON.stringify(a.details, null, 2)}</pre>}
              <div className="text-xs text-slate-500 mt-1">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ),
    });
  };

  const handleAutoNote = async () => {
    if (items.length === 0 || loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiBase = getApiBase();
      if (token && apiBase) {
        const res = await fetch(`${apiBase}/api/activity/auto-note`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items, clientId, userId: targetId }),
        });
        if (res.ok) {
          const { noted } = await res.json();
          if (noted?.length) {
            await supabase.from("activity_log").update({ noted_at: new Date().toISOString() }).in("id", noted);
            setItems((prev) => prev.map((p) => (noted.includes(p.id) ? { ...p, noted_at: new Date().toISOString() } : p)));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!targetId) return null;

  return (
    <div className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50"
      >
        <span className="font-medium">
          Notes on what happened{items.length > 0 ? ` (${items.length})` : " — no actions yet"}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={expanded ? "rotate-180" : ""}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAutoNotesScope("this_chat")}
              className={`px-2 py-1 rounded text-xs font-medium ${autoNotesScope === "this_chat" ? "bg-slate-200 dark:bg-zinc-700" : "bg-slate-100 dark:bg-zinc-800"}`}
            >
              This chat
            </button>
            <button
              type="button"
              onClick={() => setAutoNotesScope("all")}
              className={`px-2 py-1 rounded text-xs font-medium ${autoNotesScope === "all" ? "bg-slate-200 dark:bg-zinc-700" : "bg-slate-100 dark:bg-zinc-800"}`}
            >
              All notes
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
            {items.length === 0 ? (
              <p className="py-2 text-slate-500 dark:text-slate-400">Actions taken on this profile will appear here.</p>
            ) : items.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800 last:border-0">
                <span className="truncate">{a.action_type}</span>
                {a.noted_at ? (
                  <span className="text-emerald-600 dark:text-emerald-400 shrink-0">Noted</span>
                ) : (
                  <span className="text-slate-400 shrink-0">{new Date(a.created_at).toLocaleTimeString()}</span>
                )}
              </div>
            ))}
          </div>
          {items.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReview}
              className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              Review
            </button>
            <button
              type="button"
              onClick={handleAutoNote}
              disabled={loading}
              className="px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Add notes
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
