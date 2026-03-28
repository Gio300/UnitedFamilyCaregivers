"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";
import { DashboardMainContent } from "@/components/DashboardMainContent";
import { CompanionPanel } from "@/components/CompanionPanel";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { useSimulatedViewport } from "@/components/DeviceViewportFrame";
import { useApp } from "@/context/AppContext";

const GROUP_ID = "ufci-dashboard-main-companion";
const PANEL_CHAT = "chat";
const PANEL_MAIN = "main";
const PANEL_COMPANION = "companion";

export function DashboardShell({ inlinePage }: { inlinePage?: ReactNode }) {
  const { innerWidth } = useSimulatedViewport();
  const mdUp = innerWidth >= 768;
  const { leftSidebarOpen, rightSidebarOpen, setLeftSidebarOpen, setRightSidebarOpen } = useApp();
  const chatHistoryPanelRef = usePanelRef();
  const companionPanelRef = usePanelRef();

  useLayoutEffect(() => {
    if (!mdUp) return;
    const p = chatHistoryPanelRef.current;
    // #region agent log
    fetch("http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b773e" },
      body: JSON.stringify({
        sessionId: "9b773e",
        location: "DashboardShell.tsx:chat-panel-sync",
        message: "sync chat history panel",
        data: { mdUp, innerWidth, leftSidebarOpen, hasRef: !!p },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    // #endregion
    if (!p) return;
    if (leftSidebarOpen) p.expand();
    else p.collapse();
  }, [mdUp, leftSidebarOpen, chatHistoryPanelRef, innerWidth]);

  useLayoutEffect(() => {
    if (!mdUp) return;
    const p = companionPanelRef.current;
    // #region agent log
    fetch("http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b773e" },
      body: JSON.stringify({
        sessionId: "9b773e",
        location: "DashboardShell.tsx:companion-panel-sync",
        message: "sync companion panel",
        data: { mdUp, innerWidth, rightSidebarOpen, hasRef: !!p },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
    // #endregion
    if (!p) return;
    if (rightSidebarOpen) p.expand();
    else p.collapse();
  }, [mdUp, rightSidebarOpen, companionPanelRef, innerWidth]);

  if (!mdUp) {
    return (
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <DashboardMainContent inlinePage={inlinePage} />
          {leftSidebarOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/50"
                aria-label="Close chat history"
                onClick={() => setLeftSidebarOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,92vw)] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <ChatHistorySidebar />
              </aside>
            </>
          )}
        </div>
        {rightSidebarOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              aria-label="Close companion"
              onClick={() => setRightSidebarOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl border border-b-0 border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
              <CompanionPanel layout="sheet" />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Group
      id={GROUP_ID}
      orientation="horizontal"
      className="flex min-h-0 min-w-0 flex-1"
      defaultLayout={{ [PANEL_CHAT]: 0, [PANEL_MAIN]: 100, [PANEL_COMPANION]: 0 }}
    >
      <Panel
        id={PANEL_CHAT}
        panelRef={chatHistoryPanelRef}
        collapsible
        collapsedSize={0}
        defaultSize={0}
        minSize="12%"
        maxSize="38%"
        className="min-h-0 min-w-0"
      >
        <ChatHistorySidebar />
      </Panel>
      <Separator className="w-1.5 shrink-0 bg-slate-200 data-[separator=active]:bg-emerald-500/60 hover:bg-emerald-500/40 dark:bg-zinc-700 transition-colors" />
      <Panel
        id={PANEL_MAIN}
        defaultSize="100%"
        minSize="32%"
        className="min-h-0 min-w-0 flex flex-col"
        groupResizeBehavior="preserve-relative-size"
      >
        <DashboardMainContent inlinePage={inlinePage} />
      </Panel>
      <Separator className="w-1.5 shrink-0 bg-slate-200 data-[separator=active]:bg-emerald-500/60 hover:bg-emerald-500/40 dark:bg-zinc-700 transition-colors" />
      <Panel
        id={PANEL_COMPANION}
        panelRef={companionPanelRef}
        collapsible
        collapsedSize={0}
        defaultSize={0}
        minSize="16%"
        maxSize="48%"
        className="min-h-0 min-w-0 flex flex-col"
      >
        <CompanionPanel layout="inline" />
      </Panel>
    </Group>
  );
}
