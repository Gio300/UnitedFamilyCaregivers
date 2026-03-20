"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { OnboardingTour } from "@/components/OnboardingTour";
import { AppProvider } from "@/context/AppContext";
import { Toolbar } from "@/components/Toolbar";
import { ModeBar } from "@/components/ModeBar";
import { ChatPanel } from "@/components/ChatPanel";
import { CustomerServiceSidePanel } from "@/components/CustomerServiceSidePanel";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { DashboardMainContent } from "@/components/DashboardMainContent";
import { PIPContainer } from "@/components/PIPContainer";

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
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
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

  const isProfilePage = pathname === "/dashboard/profile";

  return (
    <AuthGuard>
      <AppProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
          <Toolbar onSettingsClick={() => setSettingsOpen(true)} />
          <main className="flex-1 flex min-h-0 pb-16">
            {isProfilePage ? (
              <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-auto">
                {children}
              </div>
            ) : (
              <>
                <DashboardMainContent />
              </>
            )}
          </main>
          {!isProfilePage && <ModeBar />}
        </div>
        <PIPContainer settingsOpen={settingsOpen} onCloseSettings={() => setSettingsOpen(false)} />
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
      </AppProvider>
    </AuthGuard>
  );
}
