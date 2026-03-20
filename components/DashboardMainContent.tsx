"use client";

import { useApp } from "@/context/AppContext";
import { ChatPanel } from "@/components/ChatPanel";
import { CustomerServiceSidePanel } from "@/components/CustomerServiceSidePanel";
import { EligibilitySidePanel } from "@/components/EligibilitySidePanel";
import { SupervisorSidePanel } from "@/components/SupervisorSidePanel";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";

export function DashboardMainContent() {
  const { leftSidebarOpen } = useApp();

  return (
    <>
      {leftSidebarOpen && <ChatHistorySidebar />}
      <div className="flex-1 flex min-h-0 min-w-0">
        <div className="flex-1 flex flex-col min-w-0 p-4" data-onboarding-chat>
          <ChatPanel />
        </div>
        <CustomerServiceSidePanel />
        <EligibilitySidePanel />
        <SupervisorSidePanel />
      </div>
    </>
  );
}
