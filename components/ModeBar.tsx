"use client";

import { useApp, type AppMode } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const MODES: { id: AppMode; label: string; icon: string }[] = [
  { id: "chat", label: "Chat", icon: "C" },
  { id: "notes", label: "Notes", icon: "N" },
  { id: "messenger", label: "Messenger", icon: "M" },
  { id: "profiles", label: "Profiles", icon: "P" },
  { id: "evv", label: "EVV", icon: "E" },
  { id: "customer_service", label: "Customer Service", icon: "CS" },
  { id: "appointments", label: "Appointments", icon: "A" },
  { id: "queue", label: "Queue", icon: "Q" },
  { id: "supervisor", label: "Supervisor", icon: "S" },
  { id: "eligibility", label: "Eligibility", icon: "EL" },
  { id: "contact_us", label: "Contact Us", icon: "CU" },
];

export const MODE_DESCRIPTIONS: Record<AppMode, string> = {
  chat: "Chat mode enabled. General AI chat — ask questions about United Family Caregivers, eligibility, documents, or anything else. Type your message and press Send.",
  notes: "Notes mode enabled. Call notes, activity log, and profile notes. Use the Notes bar below the chat to toggle \"This chat\" vs \"All notes\" and add auto-notes as you work.",
  messenger: "Messenger mode enabled. DMs, calls, and emails. Use the bell icon for Message Center. In chat you can mention @users and use #dm, #email, #reminder, #appointment, #call.",
  profiles: "Profiles mode enabled. View and select client or caregiver profiles. Use the list below to pick a profile to view and discuss.",
  evv: "EVV mode enabled. Electronic Visit Verification for caregiver visits. Log visits and check-in/check-out. You can also manage this via chat.",
  customer_service: "Customer Service mode enabled. Client management, eligibility, documents, onboarding. Use chat to ask about clients, run eligibility checks, or upload documents.",
  appointments: "Appointments mode enabled. Schedule and view appointments. Use chat to schedule (e.g. \"Schedule appointment for @Client tomorrow at 2pm\") or ask about upcoming appointments.",
  supervisor: "Supervisor mode enabled. Approve registrations and oversee the team. Use the bell icon for pending approvals. Chat can help with team questions.",
  eligibility: "Eligibility mode enabled. Nevada Medicaid eligibility checks. In chat: \"Check eligibility for @Name\" with DOB and recipient ID or SSN.",
  contact_us:
    "Contact Us: open Companion for live voice (LiveKit) or schedule a call. If no agent is free and voice did not help, Companion can offer a call-back via the scheduler. You can keep chatting here for text help.",
  queue:
    "Queue mode: callers waiting for a live representative. Open the queue panel to see waiting rooms, claim a call, and join the voice room.",
};

const ACCENT_CLASSES: Record<string, { active: string; inactive: string }> = {
  emerald: { active: "bg-emerald-500/90 text-white", inactive: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" },
  blue: { active: "bg-blue-500/90 text-white", inactive: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" },
  violet: { active: "bg-violet-500/90 text-white", inactive: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" },
  amber: { active: "bg-amber-500/90 text-white", inactive: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" },
};

export function ModeBar({
  vertical,
  onSelect,
  compact,
}: {
  vertical?: boolean;
  onSelect?: (mode: AppMode) => void;
  /** Smaller chips for the chat header row */
  compact?: boolean;
}) {
  const { mode, setMode, accentColor } = useApp();
  const [visibleModes, setVisibleModes] = useState<AppMode[]>([
    "chat",
    "notes",
    "messenger",
    "profiles",
    "evv",
    "eligibility",
    "contact_us",
  ]);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role, approved_at").eq("id", user.id).single().then(({ data }) => {
        const role = data?.role || "client";
        const approved = !!data?.approved_at;
        let base: AppMode[] = ["chat", "notes", "messenger", "profiles", "evv", "eligibility", "contact_us"];
        if (role === "csr_admin" && approved) {
          base = [
            "chat",
            "notes",
            "messenger",
            "profiles",
            "evv",
            "customer_service",
            "appointments",
            "queue",
            "eligibility",
            "contact_us",
          ];
        } else if (role === "management_admin" && approved) {
          base = [
            "chat",
            "notes",
            "messenger",
            "profiles",
            "evv",
            "customer_service",
            "appointments",
            "queue",
            "supervisor",
            "eligibility",
            "contact_us",
          ];
        }
        setVisibleModes(base);
      });
    });
  }, [supabase]);

  const acc = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.emerald;

  const btnClass = compact ? "px-2 py-1 rounded-md text-xs font-medium" : "px-3 py-1.5 rounded-lg text-sm font-medium";

  return (
    <div className={`flex gap-1 ${vertical ? "flex-col" : "flex-wrap items-center"}`}>
      {MODES.filter((m) => visibleModes.includes(m.id)).map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => {
            setMode(m.id);
            onSelect?.(m.id);
          }}
          className={`${btnClass} transition-colors shrink-0 ${
            mode === m.id ? acc.active : `bg-slate-100 dark:bg-zinc-800 ${acc.inactive}`
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
