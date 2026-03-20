"use client";

import { useApp } from "@/context/AppContext";

export function CustomerServiceSidePanel() {
  const { userRole } = useApp();

  if (userRole !== "csr_admin" && userRole !== "management_admin") return null;

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-auto shrink-0">
      <div className="p-4">
        <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Customer Service</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Client and caregiver management, onboarding, eligibility, documents, and notes.
        </p>
      </div>
    </aside>
  );
}
