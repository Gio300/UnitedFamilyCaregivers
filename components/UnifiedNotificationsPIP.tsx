"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCenterPIP } from "./MessageCenterPIP";

type Tab = "approvals" | "messages";

interface PendingUser {
  id: string;
  full_name: string | null;
  role: string;
  email?: string;
}

export function UnifiedNotificationsPIP({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("approvals");
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("role", ["csr_admin", "management_admin"])
          .is("approved_at", null);
        if (mounted) setUsers(error ? [] : (data || []));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  const handleApprove = async (userId: string) => {
    setActioning(userId);
    try {
      await supabase.from("profiles").update({ approved_at: new Date().toISOString() }).eq("id", userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      const { data: req } = await supabase.from("registration_requests").select("id").eq("user_id", userId).single();
      if (req) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from("registration_requests")
          .update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActioning(userId);
    try {
      const { data: req } = await supabase.from("registration_requests").select("id").eq("user_id", userId).single();
      if (req) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from("registration_requests")
          .update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } finally {
      setActioning(null);
    }
  };

  const handleEmailForInfo = (user: PendingUser) => {
    const email = user.email || "";
    const subject = "UFCi registration follow-up";
    const body = email ? "" : `Regarding: ${user.full_name || "Unknown"} (add recipient email)`;
    const q = new URLSearchParams();
    if (email) q.set("to", email);
    q.set("subject", subject);
    if (body) q.set("body", body);
    window.location.href = `mailto:${email || ""}?${q.toString()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-700 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTab("approvals")}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  tab === "approvals" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                Approvals {users.length > 0 && `(${users.length})`}
              </button>
              <button
                type="button"
                onClick={() => setTab("messages")}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  tab === "messages" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                Messages
              </button>
            </div>
          </div>
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
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "approvals" ? (
            <div className="p-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-500">No pending approvals.</p>
              ) : (
                <div className="space-y-3">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-zinc-700"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{u.full_name || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{u.role}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEmailForInfo(u)}
                          className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700"
                          title="Email for more info"
                        >
                          Email
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(u.id)}
                          disabled={!!actioning}
                          className="px-3 py-1.5 rounded text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(u.id)}
                          disabled={!!actioning}
                          className="px-3 py-1.5 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <MessageCenterPIP onClose={onClose} embedded />
          )}
        </div>
      </div>
    </div>
  );
}
