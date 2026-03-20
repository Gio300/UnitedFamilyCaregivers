"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { ModeBar } from "@/components/ModeBar";

type RightTab = "notes" | "messenger" | "tools" | "mode" | "test_users";

const TEST_USERS = [
  { email: "test_client@ufci-test.local", password: "test123", role: "Client", modes: "Chat, Notes, Messenger, EVV" },
  { email: "test_caregiver@ufci-test.local", password: "test123", role: "Caregiver", modes: "Chat, Notes, Messenger, EVV" },
  { email: "test_csr@ufci-test.local", password: "test123", role: "CSR (pending)", modes: "Basic until approved" },
  { email: "test_csr_approved@ufci-test.local", password: "test123", role: "CSR", modes: "Customer Service, Eligibility, Appointments" },
  { email: "test_manager@ufci-test.local", password: "test123", role: "Manager", modes: "Supervisor + all modes" },
];

export function RightSidebar() {
  const { setRightSidebarOpen, mode } = useApp();
  const [tab, setTab] = useState<RightTab>("notes");

  return (
    <aside className="w-72 shrink-0 border-l border-slate-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/95 flex flex-col">
      <div className="p-2 border-b border-slate-200 dark:border-zinc-700/50 flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {(["notes", "messenger", "tools", "mode", "test_users"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-2 py-1 rounded text-xs capitalize ${
                tab === t ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              {t === "test_users" ? "Test Users" : t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRightSidebarOpen(false)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
            <p className="text-xs text-slate-500 dark:text-slate-400">Switch to Messenger mode in the Mode tab to use.</p>
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Select mode</p>
            <ModeBar vertical />
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-zinc-700">
              Current: {mode.replace("_", " ")} — {mode === "chat" && "General AI chat."}
              {mode === "notes" && "Call notes, activity log."}
              {mode === "messenger" && "DMs, calls, emails."}
              {mode === "evv" && "EVV visit verification."}
              {mode === "customer_service" && "Client management, eligibility."}
              {mode === "appointments" && "Schedule appointments."}
              {mode === "supervisor" && "Approve registrations, team oversight."}
              {mode === "eligibility" && "Nevada Medicaid eligibility."}
            </p>
          </div>
        )}
        {tab === "test_users" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Test login credentials</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Use these to test all modes and profiles. Run seed_test_extended.sql for full set.</p>
            <div className="space-y-2">
              {TEST_USERS.map((u) => (
                <div key={u.email} className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{u.role}</p>
                  <p className="text-slate-600 dark:text-slate-400">Email: {u.email}</p>
                  <p className="text-slate-600 dark:text-slate-400">Password: {u.password}</p>
                  <p className="text-slate-500 dark:text-slate-500 mt-1">Modes: {u.modes}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
