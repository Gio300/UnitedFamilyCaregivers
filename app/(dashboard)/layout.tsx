"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { OnboardingTour } from "@/components/OnboardingTour";

const BASE = "/UnitedFamilyCaregivers";
const nav = [
  { href: `${BASE}/dashboard`, label: "Home" },
  { href: `${BASE}/dashboard/chat`, label: "Chat" },
  { href: `${BASE}/dashboard/profile`, label: "Profile" },
  { href: `${BASE}/dashboard/documents`, label: "Documents" },
  { href: `${BASE}/dashboard/calls`, label: "Calls" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace(`${BASE}/login`);
        return;
      }
      setReady(true);
    });
  }, [router, supabase.auth]);

  useEffect(() => {
    if (!ready) return;
    async function checkOnboarding() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      const completed = profile?.onboarding_completed ?? false;
      const localDone = typeof window !== "undefined" && localStorage.getItem("ufc_onboarding_done") === "1";
      if (!completed && !localDone) {
        setShowOnboarding(true);
      }
    }
    checkOnboarding();
  }, [ready, supabase]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <nav className="flex gap-4 px-4 py-3 max-w-4xl mx-auto" data-onboarding-nav>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium ${
                  pathname === item.href
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
          {children}
        </main>
      </div>
      {showOnboarding && (
        <OnboardingTour
          onComplete={async () => {
            setShowOnboarding(false);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
            }
            if (typeof window !== "undefined") {
              localStorage.setItem("ufc_onboarding_done", "1");
            }
          }}
        />
      )}
    </AuthGuard>
  );
}
