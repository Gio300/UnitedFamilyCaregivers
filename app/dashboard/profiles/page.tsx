"use client";

import { ProfilesPanel } from "@/components/ProfilesPanel";

export default function ProfilesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Profiles</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Clients, caregivers, and staff. Select a client to view details.
      </p>
      <ProfilesPanel />
    </div>
  );
}
