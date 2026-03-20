"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

interface ToolbarProps {
  onSettingsClick?: () => void;
}

export function Toolbar({ onSettingsClick }: ToolbarProps) {
  const { theme, setTheme, accentColor, setLeftSidebarOpen, setRightSidebarOpen, leftSidebarOpen, rightSidebarOpen, resetChat, openPIP } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>("User");
  const [pendingCount, setPendingCount] = useState(0);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("full_name, role, approved_at").eq("id", user.id).single().then(({ data }) => {
          setUserName(data?.full_name || user.email?.split("@")[0] || "User");
          const approved = !!data?.approved_at;
          setIsSupervisor(data?.role === "management_admin" && approved);
        });
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (!isSupervisor) return;
    supabase
      .from("profiles")
      .select("id")
      .in("role", ["csr_admin", "management_admin"])
      .is("approved_at", null)
      .then(({ data }) => setPendingCount(data?.length ?? 0));
  }, [isSupervisor, supabase]);

  async function handleLogout() {
    resetChat();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const accentMap: Record<string, string> = {
    emerald: "text-emerald-500",
    blue: "text-blue-500",
    violet: "text-violet-500",
    amber: "text-amber-500",
  };
  const accent = accentMap[accentColor] || accentMap.emerald;

  return (
    <header className="sticky top-0 z-20 h-10 flex items-center justify-between px-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-black text-slate-600 dark:text-white shrink-0">
      {/* Left: Chat icon, Nav, Project name */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title={leftSidebarOpen ? "Hide chat history" : "Show chat history"}
          aria-label="Toggle chat history"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title="Back"
          aria-label="Back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => router.forward()}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title="Forward"
          aria-label="Forward"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        <span className={`ml-2 text-sm font-semibold ${accent}`}>UFCi</span>
      </div>

      {/* Right: Right sidebar toggle only, Settings, User */}
      <div className="flex items-center gap-1">
        {isSupervisor && pendingCount > 0 && (
          <button
            type="button"
            onClick={() => openPIP("supervisor_approval")}
            className="relative p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
            title="Pending approvals"
            aria-label="Pending approvals"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title={rightSidebarOpen ? "Hide right panel" : "Show right panel"}
          aria-label="Toggle right panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="8" height="16" rx="1" opacity="0.5" />
            <rect x="12" y="4" width="10" height="16" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title={theme === "light" ? "Dark mode" : "Light mode"}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onSettingsClick}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title="Settings"
          aria-label="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          >
            <span className="max-w-[100px] truncate text-xs">{userName || "User"}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 mt-1 py-1 w-36 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-700 shadow-xl z-20">
                <Link
                  href="/dashboard/profile"
                  className="block px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="block w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
