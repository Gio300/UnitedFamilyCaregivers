"use client";

import { useApp, type AppMode } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";

const MODES: { id: AppMode; label: string; icon: string }[] = [
  { id: "messenger", label: "Messenger", icon: "M" },
  { id: "evv", label: "EVV", icon: "E" },
  { id: "customer_service", label: "Customer Service", icon: "CS" },
  { id: "appointments", label: "Appointments", icon: "A" },
  { id: "supervisor", label: "Supervisor", icon: "S" },
];

const ACCENT_CLASSES: Record<string, { active: string; inactive: string }> = {
  emerald: { active: "bg-emerald-500/90 text-white", inactive: "text-slate-400 hover:text-slate-200" },
  blue: { active: "bg-blue-500/90 text-white", inactive: "text-slate-400 hover:text-slate-200" },
  violet: { active: "bg-violet-500/90 text-white", inactive: "text-slate-400 hover:text-slate-200" },
  amber: { active: "bg-amber-500/90 text-white", inactive: "text-slate-400 hover:text-slate-200" },
};

export function ModeBar() {
  const { mode, setMode, accentColor } = useApp();
  const [visibleModes, setVisibleModes] = useState<AppMode[]>(["messenger", "evv"]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const email = user.email?.toLowerCase() || "";
      supabase.from("profiles").select("role, approved_at").eq("id", user.id).single().then(({ data }) => {
        const role = data?.role || "client";
        const approved = !!data?.approved_at;
        const isManagerEmail = email === "johnny.allen32@yahoo.com";
        let base: AppMode[] = ["messenger", "evv"];
        if (role === "csr_admin") {
          base = ["messenger", "evv", "customer_service", "appointments"];
        } else if (role === "management_admin") {
          base = ["messenger", "evv", "customer_service", "appointments", "supervisor"];
        }
        setVisibleModes(base);
      });
    });
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = MODES.find((m) => m.id === mode);
  const acc = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.emerald;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-zinc-700 bg-white/95 dark:bg-black/95 backdrop-blur py-2 px-4 flex items-center justify-between z-30" data-onboarding-modes>
      <div className="flex items-center gap-2" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ring-2 ring-black/10 dark:ring-white/10 ${acc.active}`}
        >
          <span>{current?.label ?? mode}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute bottom-full left-4 mb-2 w-56 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50">
            {MODES.filter((m) => visibleModes.includes(m.id)).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setDropdownOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-700 ${
                  mode === m.id ? "bg-slate-100 dark:bg-zinc-700 font-medium" : ""
                }`}
              >
                <span className="text-slate-500 dark:text-slate-400">{m.icon}</span>
                {m.label}
                {mode === m.id && (
                  <svg className="ml-auto w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
