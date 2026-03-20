"use client";

import { useApp } from "@/context/AppContext";

export function CustomerServiceSidePanel() {
  const { mode } = useApp();

  if (mode !== "customer_service") return null;

  return (
    <aside className="w-80 border-l border-slate-200 bg-white overflow-auto shrink-0">
      <div className="p-4">
        <h3 className="font-medium text-slate-800 mb-2">Customer Service</h3>
        <p className="text-sm text-slate-500">
          Client and caregiver management, onboarding, eligibility, documents, and notes.
        </p>
      </div>
    </aside>
  );
}
