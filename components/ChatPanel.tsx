"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { AutoNotesBar } from "@/components/AutoNotesBar";

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; url: string }[];
}

export function ChatPanel() {
  const { userRole, openPIP, chatResetKey, accentColor, addChatSession, updateChatSession, loadChatSession, currentSessionId, openChatSession, pendingAttachments, setPendingAttachments, activeClientId, setActiveClientId, mode, pendingAssistantMessage, setPendingAssistantMessage } = useApp();
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
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
  const [mcpLimitedMode, setMcpLimitedMode] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [showAtPicker, setShowAtPicker] = useState(false);
  const [atQuery, setAtQuery] = useState("");
  const [atIndex, setAtIndex] = useState(0);
  const [showHashPicker, setShowHashPicker] = useState(false);
  const [hashQuery, setHashQuery] = useState("");
  const [hashIndex, setHashIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!activeClientId) {
      setActiveClientName(null);
      return;
    }
    setActiveClientName(null);
    supabase
      .from("client_profiles")
      .select("full_name")
      .eq("id", activeClientId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.full_name) {
          setActiveClientName(data.full_name);
        } else {
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", activeClientId)
            .single()
            .then(({ data: p }) => setActiveClientName(p?.full_name ?? null));
        }
      });
  }, [activeClientId, supabase]);

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
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
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
    if (!currentSessionId || messages.length === 0) return;
    const t = setTimeout(() => {
      updateChatSession(currentSessionId, { messages, preview: messages[0]?.content?.slice(0, 60) || "Chat" });
    }, 2000);
    return () => clearTimeout(t);
  }, [currentSessionId, messages, updateChatSession]);

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
    if (pendingAssistantMessage) {
      setMessages((m) => [...m, { role: "assistant", content: pendingAssistantMessage }]);
      setPendingAssistantMessage(null);
    }
  }, [pendingAssistantMessage, setPendingAssistantMessage]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data: me, error: meErr }) => {
        const role = me?.role;
        if (role === "csr_admin" || role === "management_admin") {
          supabase.from("profiles").select("id, full_name").then(({ data }) => {
            setMentionUsers((data || []).map((p) => ({ ...p, email: "" })));
          });
        } else if (role === "caregiver") {
          supabase.from("client_profiles").select("user_id").eq("caregiver_id", user.id).then(({ data: clients }) => {
            const ids = [...new Set((clients || []).map((c) => c.user_id).filter(Boolean))];
            if (ids.length) {
              supabase.from("profiles").select("id, full_name").in("id", ids).then(({ data }) => {
                setMentionUsers((data || []).map((p) => ({ ...p, email: "" })));
              });
            }
          });
        } else {
          supabase.from("client_profiles").select("caregiver_id").eq("user_id", user.id).then(({ data: clients }) => {
            const ids = [...new Set((clients || []).map((c) => c.caregiver_id).filter(Boolean))];
            if (ids.length) {
              supabase.from("profiles").select("id, full_name").in("id", ids).then(({ data }) => {
                setMentionUsers((data || []).map((p) => ({ ...p, email: "" })));
              });
            }
          });
        }
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
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setMessages((m) => [...m, { role: "assistant", content: "Please sign in to use chat." }]);
        return;
      }

      const apiBase = getApiBase();
      // #region agent log
      fetch('http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9b773e'},body:JSON.stringify({sessionId:'9b773e',location:'ChatPanel.tsx:sendMessage',message:'API base before fetch',data:{apiBase:apiBase||'(empty)',hasApiBase:!!apiBase},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!apiBase) {
        setMessages((m) => [...m, { role: "assistant", content: "API base URL not configured. Set NEXT_PUBLIC_API_BASE in GitHub Secrets or .env.local." }]);
        return;
      }

      let effectiveSessionId = currentSessionId;
      if (!effectiveSessionId) {
        const sessionId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        addChatSession({
          id: sessionId,
          messages: [...messages, userMsg],
          preview: userMsg.content?.slice(0, 60) || "New chat",
          createdAt: Date.now(),
        });
        openChatSession(sessionId);
        effectiveSessionId = sessionId;
      }

      const history = messages.map(({ role, content }) => ({ role, content }));
      const useTools = userRole === "csr_admin" || userRole === "management_admin";
      const userContext = {
        role: userRole || undefined,
        activeClientId: activeClientId || undefined,
        activeClientName: activeClientName || undefined,
        mode: mode || undefined,
        session_id: effectiveSessionId || undefined,
      };
      const body = JSON.stringify({
        message: userMsg.content,
        history: messages.map(({ role, content }) => ({ role, content })),
        attachments: userMsg.attachments,
        userContext,
      });
      const fetchOpts = {
        method: "POST" as const,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      const mcpBody = JSON.stringify({ message: userMsg.content, userContext });
      let mcpRes: Response | null = null;
      try {
        mcpRes = await fetch(`${apiBase}/api/mcp`, {
          ...fetchOpts,
          headers: { ...fetchOpts.headers, Accept: "application/json" },
          body: mcpBody,
        });
      } catch {
        mcpRes = null;
      }
      if (mcpRes?.ok) {
        const mcpData = await mcpRes.json().catch(() => ({}));
        if (mcpData.response) {
          setMessages((m) => [...m, { role: "assistant", content: mcpData.response }]);
          return;
        }
      }

      const chatBody = JSON.stringify({
        message: userMsg.content,
        history,
        attachments: userMsg.attachments,
        userContext,
      });
      const chatFetchOpts = {
        ...fetchOpts,
        headers: { ...fetchOpts.headers, Accept: "text/event-stream" },
        body: chatBody,
      };
      const url = (base: string) => `${base}/api/chat?stream=1${useTools ? "&tools=1" : ""}`;

      let res: Response;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 15000);
        res = await fetch(url(apiBase), { ...chatFetchOpts, signal: controller.signal });
        clearTimeout(timeoutId);
      } catch (primaryErr) {
        clearTimeout(timeoutId);
        const isAbort = primaryErr instanceof Error && (primaryErr.message.includes("aborted") || primaryErr.message.includes("timeout"));
        if (isAbort && apiBase.includes("unitedfamilycaregivers")) {
          try {
            const fallbackController = new AbortController();
            timeoutId = setTimeout(() => fallbackController.abort(), 20000);
            res = await fetch(url("http://localhost:7501"), { ...chatFetchOpts, signal: fallbackController.signal });
            clearTimeout(timeoutId);
          } catch {
            setMessages((m) => [...m, { role: "assistant", content: "Request timed out. If you're on the same network as the server, ensure AI Gateway is running. External users: API works from the internet." }]);
            return;
          }
        } else {
          throw primaryErr;
        }
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const contentType = res.headers.get("Content-Type") || "";
      let content = "";

      if (contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        content = data.content || "";
      } else {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
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
      }

      setMcpLimitedMode(false);
      setMessages((m) => [...m, { role: "assistant", content: content || "(No response)" }]);
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      const isAbort = errMsg.includes("aborted") || errMsg.includes("timeout");
      const isFailedFetch = errMsg.includes("fetch") || errMsg.includes("Failed to fetch");
      // #region agent log
      fetch('http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9b773e'},body:JSON.stringify({sessionId:'9b773e',location:'ChatPanel.tsx:catch',message:'Chat fetch error',data:{errMsg,isFailedFetch,isAbort,apiBase:getApiBase()||'(empty)'},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      let mcpFallback: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const t = session?.access_token;
        const base = getApiBase();
        if (t && base) {
          const mcpRes = await fetch(`${base}/api/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
            body: JSON.stringify({
              message: userMsg.content,
              userContext: { activeClientId: activeClientId || undefined, activeClientName: activeClientName || undefined, mode: mode || undefined },
            }),
          });
          if (mcpRes.ok) {
            const d = await mcpRes.json().catch(() => ({}));
            if (d?.response) mcpFallback = d.response;
          }
        }
      } catch {
        /* ignore */
      }
      if (mcpFallback) {
        setMcpLimitedMode(true);
        setMessages((m) => [...m, { role: "assistant", content: `[AI in limited mode]\n\n${mcpFallback}` }]);
      } else {
        const displayMsg = isAbort
          ? "Request timed out. See UFC_AI_FIX.md — fix DNS to use the tunnel, or use a quick tunnel (scripts\\start-tunnel-and-get-url.ps1)."
          : isFailedFetch
            ? "Failed to fetch. Set NEXT_PUBLIC_API_BASE in GitHub Secrets to your AI Gateway URL (e.g. Cloudflare tunnel, api.kloudykare.com). Ensure AI Gateway is running (cd ai-gateway && npm start)."
            : `Error: ${errMsg}`;
        setMessages((m) => [...m, { role: "assistant", content: displayMsg }]);
      }
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  const isAdmin = userRole === "csr_admin" || userRole === "management_admin";

  return (
    <div className="flex flex-col flex-1 min-h-0 border border-slate-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-black shadow-sm">
      {mcpLimitedMode && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          <span>AI in limited mode — last response used MCP fallback.</span>
          <button type="button" onClick={() => setMcpLimitedMode(false)} className="text-amber-600 hover:underline">Dismiss</button>
        </div>
      )}
      {isAdmin && activeClientId && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50 text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            Viewing: <strong className="text-slate-900 dark:text-slate-100">{activeClientName ?? "Loading..."}</strong>
          </span>
          <button
            type="button"
            onClick={() => setActiveClientId(null)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
          >
            Clear
          </button>
        </div>
      )}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-scroll p-4 space-y-3 relative">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">Send a message to start chatting.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm ${m.role === "user" ? "text-right" : "text-left"}`}
          >
            {m.role === "assistant" && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Kloudy</p>
            )}
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
                  {m.attachments.map((a, j) => {
                    const isImg = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(a.url);
                    return isImg ? (
                      <button
                        key={j}
                        type="button"
                        onClick={() => openPIP("expand", {
                          title: a.name,
                          content: (
                            <div>
                              <img src={a.url} alt={a.name} className="max-w-full max-h-[80vh] object-contain rounded" />
                            </div>
                          ),
                        })}
                        className="block"
                      >
                        <img src={a.url} alt={a.name} className="max-h-24 rounded border border-slate-200 dark:border-zinc-700 object-contain cursor-pointer hover:opacity-90" />
                      </button>
                    ) : (
                      <a key={j} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs underline truncate">
                        {a.name}
                      </a>
                    );
                  })}
                </div>
              ) : null}
              {(m.content.length > 100 || m.attachments?.length) && (
                <button
                  type="button"
                  onClick={() => {
                    const isImage = (url: string) => /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url) || /image\//i.test(url);
                    openPIP("expand", {
                      title: "Message",
                      content: (
                        <div className="space-y-2">
                          {m.content !== "(attachment)" && <p className="whitespace-pre-wrap">{m.content}</p>}
                          {m.attachments?.length ? (
                            <div className="space-y-2">
                              <p className="font-medium text-sm">Attachments</p>
                              {m.attachments.map((a, j) =>
                                isImage(a.url) ? (
                                  <div key={j} className="rounded overflow-hidden border border-slate-200 dark:border-zinc-700">
                                    <img src={a.url} alt={a.name} className="max-w-full max-h-96 object-contain" />
                                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-emerald-600 mt-1">
                                      {a.name}
                                    </a>
                                  </div>
                                ) : (
                                  <a key={j} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-emerald-600 underline">
                                    {a.name}
                                  </a>
                                )
                              )}
                            </div>
                          ) : null}
                        </div>
                      ),
                    });
                  }}
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
      <AutoNotesBar clientId={activeClientId} userId={currentUserId} />
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
        {(userRole === "csr_admin" || userRole === "management_admin") && (
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
            placeholder={
              userRole === "csr_admin" || userRole === "management_admin"
                ? "Chat with Kloudy. Client help, eligibility, documents. Use @ for users, # for actions."
                : "Type a message... Use @ for users, # for actions (dm, email, reminder, appointment, call)"
            }
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
