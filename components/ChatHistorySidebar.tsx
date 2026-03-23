"use client";

import { useApp } from "@/context/AppContext";

export function ChatHistorySidebar() {
  const { chatSessions, openChatSession, deleteChatSession, currentSessionId, setLeftSidebarOpen } = useApp();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/95 flex flex-col">
      <div className="p-2 border-b border-slate-200 dark:border-zinc-700/50 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Chat history</h3>
        <button
          type="button"
          onClick={() => setLeftSidebarOpen(false)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
              <div
                key={s.id}
                className={`group flex items-center gap-1 rounded ${
                  currentSessionId === s.id ? "bg-slate-200 dark:bg-zinc-700" : "hover:bg-slate-100 dark:hover:bg-zinc-700/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    openChatSession(s.id);
                    setLeftSidebarOpen(false);
                  }}
                  className={`flex-1 min-w-0 text-left px-3 py-2 text-sm truncate ${
                    currentSessionId === s.id ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="truncate">{s.preview || s.title || "New chat"}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteChatSession(s.id); }}
                  className="shrink-0 p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100"
                  aria-label="Delete chat"
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
