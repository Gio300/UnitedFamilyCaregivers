"use client";

import Link from "next/link";

const BASE = "/UnitedFamilyCaregivers";

export default function DashboardPage() {
  return (
    <div className="space-y-6" data-onboarding-main>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Welcome to United Family Caregivers. Use the navigation above to get started.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`${BASE}/dashboard/chat`}
          className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
          data-onboarding-chat
        >
          <h2 className="font-medium">Chat</h2>
          <p className="text-sm text-zinc-500 mt-1">Talk to the AI assistant</p>
        </Link>
        <Link
          href={`${BASE}/dashboard/profile`}
          className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
          data-onboarding-profile
        >
          <h2 className="font-medium">Profile</h2>
          <p className="text-sm text-zinc-500 mt-1">View and edit your profile</p>
        </Link>
        <Link
          href={`${BASE}/dashboard/documents`}
          className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
          data-onboarding-documents
        >
          <h2 className="font-medium">Documents</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage your documents</p>
        </Link>
        <Link
          href={`${BASE}/dashboard/calls`}
          className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
          data-onboarding-calls
        >
          <h2 className="font-medium">Calls</h2>
          <p className="text-sm text-zinc-500 mt-1">Voice calls with LiveKit</p>
        </Link>
      </div>
    </div>
  );
}
