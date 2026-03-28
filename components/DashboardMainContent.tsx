"use client";

import type { ReactNode } from "react";
import { useApp, type AppMode } from "@/context/AppContext";
import { ChatPanel } from "@/components/ChatPanel";
import { CustomerServiceSidePanel } from "@/components/CustomerServiceSidePanel";
import { EligibilitySidePanel } from "@/components/EligibilitySidePanel";
import { SupervisorSidePanel } from "@/components/SupervisorSidePanel";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { ModeBar, MODE_DESCRIPTIONS } from "@/components/ModeBar";
import { QuickActionsPIP } from "@/components/QuickActionsPIP";
import { CsrCallQueuePanel } from "@/components/CsrCallQueuePanel";

export function DashboardMainContent({ inlinePage }: { inlinePage?: ReactNode }) {
  const {
    leftSidebarOpen,
    openCompanion,
    openPIP,
    setPendingAssistantMessage,
    accentColor,
    userRole,
  } = useApp();

  const isAdmin = userRole === "csr_admin" || userRole === "management_admin";

  const onModeSelect = (selected: AppMode) => {
    setPendingAssistantMessage(MODE_DESCRIPTIONS[selected]);
    if (selected === "contact_us") {
      openCompanion();
    }
    if (selected === "queue") {
      openPIP("expand", {
        title: "Calls in queue",
        content: <CsrCallQueuePanel />,
      });
    }
    if (selected === "eligibility") {
      if (isAdmin) {
        openPIP("eligibility");
      }
      openCompanion();
      if (!isAdmin) {
        setPendingAssistantMessage(
          "Eligibility (member): use Companion for a short script and approved Medicaid line. Admins use the eligibility panel for portal tools."
        );
      }
    }
  };

  return (
    <>
      {leftSidebarOpen && <ChatHistorySidebar />}
      <div className="flex-1 flex min-h-0 min-w-0 min-h-0">
        <div
          className="flex-1 flex flex-col min-h-0 min-w-0 p-2 sm:p-4 gap-2"
          data-onboarding-chat
        >
          <div className="shrink-0 -mx-0.5 px-0.5 pb-2 border-b border-slate-200 dark:border-zinc-700">
            <div
              data-ufci-modebar
              className="overflow-x-auto flex items-center gap-2 [scrollbar-width:thin] py-0.5"
            >
              <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-1">
                <ModeBar onSelect={onModeSelect} />
              </div>
              <button
                type="button"
                onClick={() =>
                  openPIP("expand", {
                    title: "Quick actions",
                    content: <QuickActionsPIP />,
                  })
                }
                className={`shrink-0 inline-flex items-center justify-center min-w-10 min-h-10 w-10 h-10 rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 text-lg font-medium leading-none ${
                  accentColor === "blue"
                    ? "focus-visible:ring-2 focus-visible:ring-blue-500"
                    : accentColor === "violet"
                      ? "focus-visible:ring-2 focus-visible:ring-violet-500"
                      : accentColor === "amber"
                        ? "focus-visible:ring-2 focus-visible:ring-amber-500"
                        : "focus-visible:ring-2 focus-visible:ring-emerald-500"
                }`}
                title="Quick actions"
                aria-label="Quick actions"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0 min-w-0 min-h-[42vh] md:min-h-0">
            {inlinePage ?? <ChatPanel />}
          </div>
        </div>
        <CustomerServiceSidePanel />
        <EligibilitySidePanel />
        <SupervisorSidePanel />
      </div>
    </>
  );
}
