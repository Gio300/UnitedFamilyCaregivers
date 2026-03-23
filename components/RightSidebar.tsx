"use client";

import { useState } from "react";
import { useApp, type AppMode } from "@/context/AppContext";
import { ModeBar, MODE_DESCRIPTIONS } from "@/components/ModeBar";
import { ProfilesPanel } from "@/components/ProfilesPanel";

type SidebarView = "options" | "profiles";

export function RightSidebar() {
  const { rightSidebarOpen, setRightSidebarOpen, mode, setMode, setPendingAssistantMessage } = useApp();
  const [view, setView] = useState<SidebarView>("options");

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
            {view === "options" ? "Options Menu" : "Profiles"}
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
        {view === "options" ? (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Select an option to enable that mode. The chat can do all of these — use this as a visual guide.
            </p>
            <ModeBar vertical onSelect={handleOptionSelect} />
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-3 mt-3 border-t border-slate-200 dark:border-zinc-700">
              Current: {mode.replace("_", " ")}
            </p>
            <button
              type="button"
              onClick={() => setView("profiles")}
              className="mt-3 block w-full py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-center"
            >
              Profiles
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setView("options")}
              className="mb-3 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ← Back to Options
            </button>
            <ProfilesPanel />
          </>
        )}
      </div>
    </aside>
  );
}
