"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { OnboardingTour } from "@/components/OnboardingTour";
import { AppProvider } from "@/context/AppContext";
import { Toolbar } from "@/components/Toolbar";
import { DashboardShell } from "@/components/DashboardShell";
import { PIPContainer } from "@/components/PIPContainer";
import { DeviceViewportFrame } from "@/components/DeviceViewportFrame";

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      const user = session.user;
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();
      if (!profile) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "",
          role: user.user_metadata?.role ?? "client",
        }, { onConflict: "id" });
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
  const isPendingApprovalPage = pathname === "/dashboard/pending-approval";
  const isCustomerSupportPage = pathname === "/dashboard/customer-support";
  const isVoiceLabPage = pathname === "/dashboard/voice-lab";

  return (
    <AuthGuard>
      <AppProvider>
        <div className="h-dvh min-h-0 flex flex-col overflow-hidden">
          <DeviceViewportFrame>
            <div className="flex h-full min-h-0 min-w-0 flex-col bg-white dark:bg-black">
              <Toolbar onSettingsClick={() => setSettingsOpen(true)} />
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {isPendingApprovalPage ? (
                  <div className="min-h-0 flex-1 overflow-auto">
                    {children}
                  </div>
                ) : isVoiceLabPage ? (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
                    {children}
                  </div>
                ) : (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <DashboardShell
                      inlinePage={
                        isProfilePage ? (
                          <div className="mx-auto w-full max-w-4xl flex-1 overflow-auto px-4 py-6">{children}</div>
                        ) : undefined
                      }
                    />
                    {isCustomerSupportPage ? children : null}
                  </div>
                )}
              </main>
            </div>
          </DeviceViewportFrame>
        </div>
        <PIPContainer settingsOpen={settingsOpen} onCloseSettings={() => setSettingsOpen(false)} settingsPriority={showOnboarding} />
        {showOnboarding && (
          <OnboardingTour
            onOpenSettings={() => setSettingsOpen(true)}
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
