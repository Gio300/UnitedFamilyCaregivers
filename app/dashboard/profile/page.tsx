"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProfileForm } from "@/components/ProfileForm";
import { ActivityList } from "@/components/ActivityList";
import { useApp } from "@/context/AppContext";

export default function ProfilePage() {
  const { setActiveClientId, resetChat } = useApp();
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setActiveClientId(null);
      }
    });
  }, [supabase, setActiveClientId]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Update your profile information.
      </p>
      <ActivityList clientId={null} userId={userId} onAutoNote={() => resetChat()} />
      <ProfileForm />
    </div>
  );
}
