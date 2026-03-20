"use client";

import { useApp } from "@/context/AppContext";

export function ChatHistorySidebar() {
  const { chatSessions, openChatSession, currentSessionId, setLeftSidebarOpen } = useApp();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 flex flex-col">
      <div className="p-2 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Chat history</h3>
        <button
          type="button"
          onClick={() => setLeftSidebarOpen(false)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {chatSessions.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4">No previous chats. Start a conversation to see it here.</p>
        ) : (
          <div className="space-y-1">
            {chatSessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  openChatSession(s.id);
                  setLeftSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm truncate ${
                  currentSessionId === s.id
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="truncate">{s.preview || "New chat"}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
