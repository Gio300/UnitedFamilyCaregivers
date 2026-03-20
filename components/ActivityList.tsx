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

interface ActivityListProps {
  clientId: string | null;
  userId: string | null;
  onAutoNote?: (items: ActivityItem[]) => void;
}

export function ActivityList({ clientId, userId, onAutoNote }: ActivityListProps) {
  const { openPIP, setActiveClientId, resetChat } = useApp();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const targetId = clientId || userId;

  useEffect(() => {
    if (!targetId) {
      setItems([]);
      return;
    }
    let q = supabase.from("activity_log").select("id, action_type, details, noted_at, created_at").order("created_at", { ascending: false }).limit(50);
    if (clientId) {
      q = q.eq("client_id", clientId);
    } else {
      q = q.eq("user_id", targetId).is("client_id", null);
    }
    q.then(({ data }) => setItems(data || []));
  }, [targetId, clientId, supabase]);

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
          onAutoNote?.(items);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={expanded ? "rotate-90" : ""}>
            <path d="M9 18l6-6-6-6" />
          </svg>
          {items.length} {items.length === 1 ? "Activity" : "Activities"}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => setItems([])} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            Undo All
          </button>
          <button type="button" onClick={() => {}} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            Keep All
          </button>
          <button type="button" onClick={handleReview} className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700">
            Review
          </button>
          <button type="button" onClick={handleAutoNote} disabled={loading} className="px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
            Auto Note
          </button>
        </div>
      </div>
      {expanded && (
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
          {items.map((a) => (
            <div key={a.id} className="px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="font-medium">{a.action_type}</span>
                {a.noted_at ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Noted</span>
                ) : (
                  <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</span>
                )}
              </div>
              {a.details && Object.keys(a.details).length > 0 && (
                <div className="text-xs text-slate-500 mt-1 truncate">{JSON.stringify(a.details)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
