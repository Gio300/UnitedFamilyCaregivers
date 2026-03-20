"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6" data-onboarding-main>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-slate-600">
        Welcome to United Family Caregivers. Use the navigation above to get started.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/chat"
          className="block p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          data-onboarding-chat
        >
          <h2 className="font-medium">Chat</h2>
          <p className="text-sm text-slate-500 mt-1">Talk to the AI assistant</p>
        </Link>
        <Link
          href="/dashboard/profile"
          className="block p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          data-onboarding-profile
        >
          <h2 className="font-medium">Profile</h2>
          <p className="text-sm text-slate-500 mt-1">View and edit your profile</p>
        </Link>
        <Link
          href="/dashboard/documents"
          className="block p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          data-onboarding-documents
        >
          <h2 className="font-medium">Documents</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your documents</p>
        </Link>
        <Link
          href="/dashboard/calls"
          className="block p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          data-onboarding-calls
        >
          <h2 className="font-medium">Calls</h2>
          <p className="text-sm text-slate-500 mt-1">Voice calls with LiveKit</p>
        </Link>
      </div>
    </div>
  );
}
