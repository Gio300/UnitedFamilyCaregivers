"use client";

import { useApp, type AppMode } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const MODES: { id: AppMode; label: string }[] = [
  { id: "messenger", label: "Messenger" },
  { id: "evv", label: "EVV" },
  { id: "customer_service", label: "Customer Service" },
  { id: "appointments", label: "Appointments" },
  { id: "supervisor", label: "Supervisor" },
];

export function ModeBar() {
  const { mode, setMode } = useApp();
  const [visibleModes, setVisibleModes] = useState<AppMode[]>(["messenger", "evv"]);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role, approved_at").eq("id", user.id).single().then(({ data }) => {
        const role = data?.role || "client";
        const approved = !!data?.approved_at;
        const base: AppMode[] = ["messenger", "evv"];
        if (role === "csr_admin" || role === "management_admin") {
          base.push("customer_service", "appointments");
        }
        if (role === "management_admin" && approved) {
          base.push("supervisor");
        }
        setVisibleModes(base);
      });
    });
  }, [supabase]);

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur py-2 px-4 flex justify-center gap-2 z-30" data-onboarding-modes>
      {MODES.filter((m) => visibleModes.includes(m.id)).map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            mode === m.id
              ? "border-2 border-emerald-500 text-emerald-600 bg-emerald-50"
              : "border border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
