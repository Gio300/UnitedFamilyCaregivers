"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface PendingUser {
  id: string;
  full_name: string | null;
  role: string;
}

export function SupervisorApprovalPIP({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    void Promise.resolve(
      supabase.from("profiles").select("id, full_name, role").in("role", ["csr_admin", "management_admin"]).is("approved_at", null)
    )
      .then(({ data }) => setUsers(data || []))
      .then(() => setLoading(false), () => setLoading(false));
  }, [supabase]);

  const handleApprove = async (userId: string) => {
    setActioning(userId);
    try {
      await supabase.from("profiles").update({ approved_at: new Date().toISOString() }).eq("id", userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      const { data: req } = await supabase.from("registration_requests").select("id").eq("user_id", userId).single();
      if (req) {
        await supabase
          .from("registration_requests")
          .update({ status: "approved", reviewed_by: (await supabase.auth.getUser()).data.user?.id, reviewed_at: new Date().toISOString() })
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
        await supabase
          .from("registration_requests")
          .update({ status: "rejected", reviewed_by: (await supabase.auth.getUser()).data.user?.id, reviewed_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pending Approvals</h2>
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
        <div className="max-h-80 overflow-y-auto p-4">
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
                      onClick={() => handleApprove(u.id)}
                      disabled={!!actioning}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(u.id)}
                      disabled={!!actioning}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
