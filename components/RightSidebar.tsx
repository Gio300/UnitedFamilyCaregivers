"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp, type AppMode } from "@/context/AppContext";
import { ModeBar, MODE_DESCRIPTIONS } from "@/components/ModeBar";
import { ProfilesPanel } from "@/components/ProfilesPanel";

const MODE_QUICK_TIPS: Record<AppMode, string> = {
  chat: "Ask about UFC, eligibility, or documents.",
  notes: "Use Notes bar: This chat vs All notes.",
  messenger: "Use @users and #dm, #email, #reminder.",
  profiles: "Select a profile below to view and discuss.",
  evv: "Log visits and check-in/out.",
  customer_service: "Ask about clients, run eligibility, upload docs.",
  appointments: "Schedule via chat: e.g. \"Tomorrow at 2pm\".",
  supervisor: "Use bell for pending approvals.",
  eligibility: "Check eligibility: @Name with DOB + ID or SSN.",
};

export function RightSidebar() {
  const { rightSidebarOpen, setRightSidebarOpen, mode, setMode, setPendingAssistantMessage, activeClientId, setActiveClientId, userRole } = useApp();
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!activeClientId) {
      setActiveClientName(null);
      return;
    }
    setActiveClientName(null);
    supabase
      .from("client_profiles")
      .select("full_name")
      .eq("id", activeClientId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.full_name) {
          setActiveClientName(data.full_name);
        } else {
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", activeClientId)
            .single()
            .then(({ data: p }) => setActiveClientName(p?.full_name ?? null));
        }
      });
  }, [activeClientId, supabase]);

  const isAdmin = userRole === "csr_admin" || userRole === "management_admin";

  if (!rightSidebarOpen) return null;

  const handleOptionSelect = (selectedMode: AppMode) => {
    setMode(selectedMode);
    setPendingAssistantMessage(MODE_DESCRIPTIONS[selectedMode]);
  };

  return (
    <aside className="w-72 shrink-0 border-l border-slate-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/95 flex flex-col">
      <div className="p-3 border-b border-slate-200 dark:border-zinc-700/50 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Options Menu
          </h3>
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
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {isAdmin && (
          <div className="mb-3 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/80 text-xs">
            {activeClientId ? (
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  Viewing: <strong className="text-slate-900 dark:text-slate-100">{activeClientName ?? "…"}</strong>
                </span>
                <button type="button" onClick={() => setActiveClientId(null)} className="shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline">
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">No profile selected</span>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Select an option to enable that mode. The chat can do all of these — use this as a visual guide.
        </p>
        <ModeBar vertical onSelect={handleOptionSelect} />
        <p className="text-xs text-slate-500 dark:text-slate-400 pt-3 mt-3 border-t border-slate-200 dark:border-zinc-700">
          Current: {mode.replace("_", " ")}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1" title={MODE_DESCRIPTIONS[mode]}>
          {MODE_QUICK_TIPS[mode]}
        </p>
        {mode === "profiles" && (
          <div className="mt-3 border-t border-slate-200 dark:border-zinc-700 pt-3">
            <ProfilesPanel embedded />
          </div>
        )}
      </div>
    </aside>
  );
}
