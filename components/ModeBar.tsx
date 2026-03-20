"use client";

import { useApp, type AppMode } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const MODES: { id: AppMode; label: string; icon: string }[] = [
  { id: "chat", label: "Chat", icon: "C" },
  { id: "notes", label: "Notes", icon: "N" },
  { id: "messenger", label: "Messenger", icon: "M" },
  { id: "evv", label: "EVV", icon: "E" },
  { id: "customer_service", label: "Customer Service", icon: "CS" },
  { id: "appointments", label: "Appointments", icon: "A" },
  { id: "supervisor", label: "Supervisor", icon: "S" },
];

const ACCENT_CLASSES: Record<string, { active: string; inactive: string }> = {
  emerald: { active: "bg-emerald-500/90 text-white", inactive: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" },
  blue: { active: "bg-blue-500/90 text-white", inactive: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" },
  violet: { active: "bg-violet-500/90 text-white", inactive: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" },
  amber: { active: "bg-amber-500/90 text-white", inactive: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" },
};

export function ModeBar() {
  const { mode, setMode, accentColor } = useApp();
  const [visibleModes, setVisibleModes] = useState<AppMode[]>(["chat", "notes", "messenger", "evv"]);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role, approved_at").eq("id", user.id).single().then(({ data }) => {
        const role = data?.role || "client";
        const approved = !!data?.approved_at;
        let base: AppMode[] = ["chat", "notes", "messenger", "evv"];
        if (role === "csr_admin" && approved) {
          base = ["chat", "notes", "messenger", "evv", "customer_service", "appointments"];
        } else if (role === "management_admin" && approved) {
          base = ["chat", "notes", "messenger", "evv", "customer_service", "appointments", "supervisor"];
        }
        setVisibleModes(base);
      });
    });
  }, [supabase]);

  const acc = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.emerald;

  return (
    <div className="flex items-center gap-1">
      {MODES.filter((m) => visibleModes.includes(m.id)).map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === m.id ? acc.active : `bg-slate-100 dark:bg-zinc-800 ${acc.inactive}`
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
