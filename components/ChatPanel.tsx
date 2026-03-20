"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { useApp } from "@/context/AppContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; url: string }[];
}

export function ChatPanel() {
  const { mode, openPIP, chatResetKey, accentColor, addChatSession, loadChatSession, currentSessionId, pendingAttachments, setPendingAttachments } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [showAtPicker, setShowAtPicker] = useState(false);
  const [atQuery, setAtQuery] = useState("");
  const [atIndex, setAtIndex] = useState(0);
  const [showHashPicker, setShowHashPicker] = useState(false);
  const [hashQuery, setHashQuery] = useState("");
  const [hashIndex, setHashIndex] = useState(0);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const HASH_ACTIONS = [
    { id: "dm", label: "DM", icon: "💬" },
    { id: "email", label: "Email", icon: "✉️" },
    { id: "reminder", label: "Set reminder", icon: "⏰" },
    { id: "appointment", label: "Schedule appointment", icon: "📅" },
    { id: "call", label: "Call", icon: "📞" },
  ];

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "40px";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    const msgs = messagesRef.current;
    if (msgs.length > 0) {
      addChatSession({
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        messages: [...msgs],
        preview: msgs[0]?.content?.slice(0, 60) || "New chat",
        createdAt: Date.now(),
      });
    }
    setMessages([]);
  }, [chatResetKey, addChatSession]);

  useEffect(() => {
    if (!currentSessionId) return;
    const session = loadChatSession(currentSessionId);
    if (session) setMessages(session.messages);
  }, [currentSessionId, loadChatSession]);

  useEffect(() => {
    if (pendingAttachments.length > 0) {
      setAttachments((a) => [...a, ...pendingAttachments]);
      setPendingAttachments([]);
    }
  }, [pendingAttachments, setPendingAttachments]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("id, full_name").neq("id", user.id).then(({ data: profiles }) => {
        supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data: me }) => {
          const role = me?.role;
          if (role === "csr_admin" || role === "management_admin") {
            supabase.from("profiles").select("id, full_name").then(({ data }) => setMentionUsers((data || []).map((p) => ({ ...p, email: "" }))));
          } else if (role === "caregiver") {
            supabase.from("client_profiles").select("user_id").eq("caregiver_id", user.id).then(({ data: clients }) => {
              const ids = [...new Set((clients || []).map((c) => c.user_id).filter(Boolean))];
              if (ids.length) {
                supabase.from("profiles").select("id, full_name").in("id", ids).then(({ data }) => setMentionUsers((data || []).map((p) => ({ ...p, email: "" }))));
              }
            });
          } else {
            supabase.from("client_profiles").select("caregiver_id").eq("user_id", user.id).then(({ data: clients }) => {
              const ids = [...new Set((clients || []).map((c) => c.caregiver_id).filter(Boolean))];
              if (ids.length) {
                supabase.from("profiles").select("id, full_name").in("id", ids).then(({ data }) => setMentionUsers((data || []).map((p) => ({ ...p, email: "" }))));
              }
            });
          }
        });
      });
    });
  }, [supabase]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const check = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > 80);
    };
    el.addEventListener("scroll", check);
    check();
    return () => el.removeEventListener("scroll", check);
  }, [messages]);

  async function sendMessage() {
    if ((!input.trim() && attachments.length === 0) || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() || "(attachment)", attachments: attachments.length ? [...attachments] : undefined };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setAttachments([]);
    setLoading(true);
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setMessages((m) => [...m, { role: "assistant", content: "Please sign in to use chat." }]);
        return;
      }

      const apiBase = getApiBase();
      if (!apiBase) {
        setMessages((m) => [...m, { role: "assistant", content: "API base URL not configured." }]);
        return;
      }

      const history = messages.map(({ role, content }) => ({ role, content }));
      const res = await fetch(`${apiBase}/api/chat?stream=1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: userMsg.content,
          history,
          attachments: userMsg.attachments,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) content += data.content;
              } catch {}
            }
          }
        }
      }

      setMessages((m) => [...m, { role: "assistant", content: content || "(No response)" }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown error"}` },
      ]);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 border border-slate-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-black shadow-sm">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-scroll p-4 space-y-3 relative">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">Send a message to start chatting.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm ${m.role === "user" ? "text-right" : "text-left"}`}
          >
            <div className={`inline-block max-w-[85%] px-3 py-2 rounded-lg ${
              m.role === "user"
                ? accentColor === "blue" ? "bg-blue-600 text-white" :
                  accentColor === "violet" ? "bg-violet-600 text-white" :
                  accentColor === "amber" ? "bg-amber-600 text-white" :
                  "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100"
            }`}>
              {m.content !== "(attachment)" && <p className="whitespace-pre-wrap">{m.content}</p>}
              {m.attachments?.length ? (
                <div className="mt-2 space-y-1">
                  {m.attachments.map((a, j) => (
                    <a key={j} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs underline truncate">
                      {a.name}
                    </a>
                  ))}
                </div>
              ) : null}
              {(m.content.length > 100 || m.attachments?.length) && (
                <button
                  type="button"
                  onClick={() => openPIP("expand", {
                    title: "Message",
                    content: (
                      <div className="space-y-2">
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        {m.attachments?.length ? (
                          <div>
                            <p className="font-medium text-sm mb-1">Attachments</p>
                            {m.attachments.map((a, j) => (
                              <a key={j} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-emerald-600 underline">
                                {a.name}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ),
                  })}
                  className="mt-2 text-xs text-emerald-600 hover:underline"
                >
                  View / Expand
                </button>
              )}
            </div>
          </div>
        ))}
        {streaming && (
          <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse" />
        )}
        <div ref={bottomRef} />
        {showScrollToBottom && (
          <button
            type="button"
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-6 right-6 p-2 rounded-full bg-slate-200 dark:bg-zinc-600 text-slate-700 dark:text-slate-200 shadow-lg hover:bg-slate-300 dark:hover:bg-zinc-500"
            aria-label="Scroll to bottom"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      <div className="p-3 border-t border-slate-200 dark:border-zinc-700 space-y-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 text-sm">
                {a.name}
                <button type="button" onClick={() => setAttachments((x) => x.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() => openPIP("document")}
          className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-zinc-700"
          title="Documents & attachments"
          aria-label="Attach"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        {mode === "customer_service" && (
          <button
            type="button"
            onClick={() => openPIP("eligibility")}
            className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-zinc-700"
            title="Eligibility"
            aria-label="Eligibility"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </button>
        )}
        <div ref={inputContainerRef} className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              const pos = e.target.selectionStart || v.length;
              const before = v.slice(0, pos);
              const atMatch = before.match(/@(\w*)$/);
              const hashMatch = before.match(/#(\w*)$/);
              if (atMatch) {
                setShowAtPicker(true);
                setShowHashPicker(false);
                setAtQuery(atMatch[1].toLowerCase());
                setAtIndex(0);
              } else if (hashMatch) {
                setShowHashPicker(true);
                setShowAtPicker(false);
                setHashQuery(hashMatch[1].toLowerCase());
                setHashIndex(0);
              } else {
                setShowAtPicker(false);
                setShowHashPicker(false);
              }
              setInput(v);
            }}
            onKeyDown={(e) => {
              if (showAtPicker && mentionUsers.length) {
                const filtered = mentionUsers.filter((u) => (u.full_name || "").toLowerCase().includes(atQuery));
                if (e.key === "ArrowDown") { e.preventDefault(); setAtIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
                if (e.key === "ArrowUp") { e.preventDefault(); setAtIndex((i) => Math.max(i - 1, 0)); return; }
                if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); const u = filtered[atIndex]; if (u) { const pos = textareaRef.current?.selectionStart ?? input.length; const before = input.slice(0, input.lastIndexOf("@")); setInput(before + `@${u.full_name} `); setShowAtPicker(false); } return; }
                if (e.key === "Escape") { setShowAtPicker(false); return; }
              }
              if (showHashPicker) {
                const filtered = HASH_ACTIONS.filter((a) => a.label.toLowerCase().includes(hashQuery) || a.id.includes(hashQuery));
                if (e.key === "ArrowDown") { e.preventDefault(); setHashIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
                if (e.key === "ArrowUp") { e.preventDefault(); setHashIndex((i) => Math.max(i - 1, 0)); return; }
                if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); const a = filtered[hashIndex]; if (a) { const before = input.slice(0, input.lastIndexOf("#")); setInput(before + `#${a.label} `); setShowHashPicker(false); } return; }
                if (e.key === "Escape") { setShowHashPicker(false); return; }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message... Use @ for users, # for actions (dm, email, reminder, appointment, call)"
            rows={1}
            className="w-full min-h-[40px] max-h-[200px] rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm resize-y overflow-y-auto"
          />
          {showAtPicker && (
            <div className="absolute bottom-full left-0 mb-1 w-56 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50">
              {mentionUsers.filter((u) => (u.full_name || "").toLowerCase().includes(atQuery)).slice(0, 8).map((u, i) => (
                <button key={u.id} type="button" onClick={() => { const before = input.slice(0, input.lastIndexOf("@")); setInput(before + `@${u.full_name} `); setShowAtPicker(false); textareaRef.current?.focus(); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 ${i === atIndex ? "bg-slate-100 dark:bg-zinc-700" : ""} text-slate-900 dark:text-slate-100`}>
                  {u.full_name || "Unknown"}
                </button>
              ))}
              {mentionUsers.filter((u) => (u.full_name || "").toLowerCase().includes(atQuery)).length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No users found</div>}
            </div>
          )}
          {showHashPicker && (
            <div className="absolute bottom-full left-0 mb-1 w-56 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50">
              {HASH_ACTIONS.filter((a) => a.label.toLowerCase().includes(hashQuery) || a.id.includes(hashQuery)).map((a, i) => (
                <button key={a.id} type="button" onClick={() => { const before = input.slice(0, input.lastIndexOf("#")); setInput(before + `#${a.label} `); setShowHashPicker(false); textareaRef.current?.focus(); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center gap-2 ${i === hashIndex ? "bg-slate-100 dark:bg-zinc-700" : ""} text-slate-900 dark:text-slate-100`}>
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={sendMessage}
          disabled={loading}
          className={`rounded-lg text-white px-4 py-2 text-sm font-medium disabled:opacity-50 ring-2 ring-black/10 dark:ring-white/10 ${
            accentColor === "blue" ? "bg-blue-600 hover:bg-blue-700" :
            accentColor === "violet" ? "bg-violet-600 hover:bg-violet-700" :
            accentColor === "amber" ? "bg-amber-600 hover:bg-amber-700" :
            "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          Send
        </button>
        </div>
      </div>
    </div>
  );
}
