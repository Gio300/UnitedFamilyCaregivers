"use client";

import { useApp } from "@/context/AppContext";
import { ChatPanel } from "@/components/ChatPanel";
import { CustomerServiceSidePanel } from "@/components/CustomerServiceSidePanel";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { RightSidebar } from "@/components/RightSidebar";

export function DashboardMainContent() {
  const { leftSidebarOpen, rightSidebarOpen } = useApp();

  return (
    <>
      {leftSidebarOpen && <ChatHistorySidebar />}
      <div className="flex-1 flex min-h-0 min-w-0">
        <div className="flex-1 flex flex-col min-w-0 p-4" data-onboarding-chat>
          <ChatPanel />
        </div>
        <CustomerServiceSidePanel />
      </div>
      {rightSidebarOpen && <RightSidebar />}
    </>
  );
}
