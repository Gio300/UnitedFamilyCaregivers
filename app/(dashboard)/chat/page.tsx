"use client";

import { ChatPanel } from "@/components/ChatPanel";

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Chat</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Ask questions about United Family Caregivers, Nevada/Arizona programs, or general support.
      </p>
      <ChatPanel />
    </div>
  );
}
