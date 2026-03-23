"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";

interface CallNote {
  id: string;
  call_reason: string | null;
  disposition: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: string;
  approved_at: string | null;
}

export function SupervisorSidePanel() {
  const { userRole, openPIP } = useApp();
  const [notes, setNotes] = useState<CallNote[]>([]);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"notes" | "users">("notes");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const isSupervisor = userRole === "management_admin" || userRole === "csr_admin";

  useEffect(() => {
    if (!isSupervisor) return;
    Promise.all([
      supabase
        .from("call_notes")
        .select("id, call_reason, disposition, notes, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => setNotes(data || [])),
      supabase
        .from("profiles")
        .select("id, full_name, role, approved_at")
        .order("full_name")
        .then(({ data }) => setUsers(data || [])),
    ]).finally(() => setLoading(false));
  }, [isSupervisor, supabase]);

  const q = search.toLowerCase().trim();
  const filteredNotes = q
    ? notes.filter(
        (n) =>
          (n.call_reason || "").toLowerCase().includes(q) ||
          (n.disposition || "").toLowerCase().includes(q) ||
          (n.notes || "").toLowerCase().includes(q)
      )
    : notes;
  const filteredUsers = q
    ? users.filter(
        (u) =>
          (u.full_name || "").toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      )
    : users;

  if (!isSupervisor) return null;

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-auto shrink-0 flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-zinc-700 space-y-3">
        <h3 className="font-medium text-slate-800 dark:text-slate-200">Supervisor Dashboard</h3>
        <input
          type="search"
          placeholder="Search notes or users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTab("notes")}
            className={`px-2 py-1 rounded text-xs font-medium ${tab === "notes" ? "bg-slate-200 dark:bg-zinc-700" : "bg-slate-100 dark:bg-zinc-800"}`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => setTab("users")}
            className={`px-2 py-1 rounded text-xs font-medium ${tab === "users" ? "bg-slate-200 dark:bg-zinc-700" : "bg-slate-100 dark:bg-zinc-800"}`}
          >
            Users
          </button>
        </div>
        <button
          type="button"
          onClick={() => openPIP("supervisor_approval")}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          Pending Approvals
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : tab === "notes" ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium">Recent call notes</p>
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-slate-400">No notes match.</p>
            ) : (
              filteredNotes.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className="p-2 rounded border border-slate-200 dark:border-zinc-700 text-xs"
                >
                  <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {n.call_reason || "Note"}
                  </p>
                  <p className="text-slate-500 truncate">{n.disposition || n.notes || "—"}</p>
                  <p className="text-slate-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium">Profiles</p>
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-slate-400">No users match.</p>
            ) : (
              filteredUsers.slice(0, 20).map((u) => (
                <div
                  key={u.id}
                  className="p-2 rounded border border-slate-200 dark:border-zinc-700 text-xs"
                >
                  <p className="font-medium text-slate-700 dark:text-slate-300">{u.full_name || "Unknown"}</p>
                  <p className="text-slate-500">{u.role} {u.approved_at ? "· Approved" : "· Pending"}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
