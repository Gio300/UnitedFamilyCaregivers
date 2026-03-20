"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";

type RightTab = "notes" | "messenger" | "tools" | "mode";

export function RightSidebar() {
  const { setRightSidebarOpen, mode } = useApp();
  const [tab, setTab] = useState<RightTab>("notes");

  return (
    <aside className="w-72 shrink-0 border-l border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 flex flex-col">
      <div className="p-2 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {(["notes", "messenger", "tools", "mode"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-2 py-1 rounded text-xs capitalize ${
                tab === t ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRightSidebarOpen(false)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "notes" && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Call notes, activity log, and profile notes appear here.</p>
            <p className="text-xs text-slate-500">Use the Activity list on the profile page to auto-note.</p>
          </div>
        )}
        {tab === "messenger" && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">Messenger view for DMs, calls, and emails.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Switch to Messenger mode in the mode bar to use.</p>
          </div>
        )}
        {tab === "tools" && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">Tools and shortcuts.</p>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <li>• Documents</li>
              <li>• Eligibility (Customer Service)</li>
              <li>• More coming soon</li>
            </ul>
          </div>
        )}
        {tab === "mode" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Current mode: {mode.replace("_", " ")}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === "messenger" && "DMs, calls, emails. Use @ for users, # for actions."}
              {mode === "evv" && "EVV visit verification and time tracking."}
              {mode === "customer_service" && "Client management, eligibility, documents, notes."}
              {mode === "appointments" && "Schedule and manage appointments."}
              {mode === "supervisor" && "Supervisor dashboard and oversight."}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
