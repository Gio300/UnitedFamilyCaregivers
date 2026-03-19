"use client";

import { ProfileForm } from "@/components/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Update your profile information.
      </p>
      <ProfileForm />
    </div>
  );
}
