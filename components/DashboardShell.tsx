"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { DashboardMainContent } from "@/components/DashboardMainContent";
import { CompanionPanel } from "@/components/CompanionPanel";

const MD_UP = "(min-width: 768px)";

function subscribeMdUp(onChange: () => void) {
  const mq = window.matchMedia(MD_UP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMdUpSnapshot() {
  return window.matchMedia(MD_UP).matches;
}

function getMdUpServerSnapshot() {
  return false;
}

const GROUP_ID = "ufci-dashboard-main-companion";
const PANEL_MAIN = "main";
const PANEL_COMPANION = "companion";

export function DashboardShell({ inlinePage }: { inlinePage?: ReactNode }) {
  const mdUp = useSyncExternalStore(subscribeMdUp, getMdUpSnapshot, getMdUpServerSnapshot);

  if (!mdUp) {
    return (
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <DashboardMainContent inlinePage={inlinePage} />
        </div>
        <CompanionPanel />
      </div>
    );
  }

  return (
    <Group id={GROUP_ID} orientation="horizontal" className="flex flex-1 min-h-0 min-w-0">
      <Panel id={PANEL_MAIN} defaultSize="72%" minSize="45%" className="min-w-0 min-h-0 flex flex-col">
        <DashboardMainContent inlinePage={inlinePage} />
      </Panel>
      <Separator className="w-1.5 shrink-0 bg-slate-200 dark:bg-zinc-700 hover:bg-emerald-500/40 data-[separator=active]:bg-emerald-500/60 transition-colors" />
      <Panel id={PANEL_COMPANION} defaultSize="28%" minSize="18%" maxSize="42%" className="min-w-0 min-h-0 flex flex-col">
        <CompanionPanel />
      </Panel>
    </Group>
  );
}
