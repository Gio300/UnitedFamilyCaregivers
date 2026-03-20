"use client";

import { useApp } from "@/context/AppContext";

export function SupervisorSidePanel() {
  const { userRole, openPIP } = useApp();

  if (userRole !== "management_admin") return null;

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-auto shrink-0">
      <div className="p-4 space-y-4">
        <h3 className="font-medium text-slate-800 dark:text-slate-200">Supervisor Dashboard</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Approve registration requests, oversee caregivers and clients, and manage team access.
        </p>
        <button
          type="button"
          onClick={() => openPIP("supervisor_approval")}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          Pending Approvals
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Use the toolbar badge or this button to review and approve new registrations.
        </p>
      </div>
    </aside>
  );
}
