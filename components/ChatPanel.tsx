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
  const { mode, openPIP } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <div className="flex flex-col flex-1 min-h-0 border border-slate-200 rounded-xl bg-white shadow-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-900"
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
      </div>
      <div className="p-3 border-t border-slate-200 space-y-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-sm">
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
          className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
          title="Upload document"
          aria-label="Documents"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
          title="Attach file"
          aria-label="Attach"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={async (e) => {
            const files = e.target.files;
            if (!files?.length) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            for (const f of Array.from(files)) {
              const path = `chat/${user.id}/${Date.now()}_${f.name}`;
              const { data, error } = await supabase.storage.from("documents").upload(path, f);
              if (!error && data?.path) {
                const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);
                setAttachments((a) => [...a, { name: f.name, url: urlData.publicUrl }]);
              }
            }
            e.target.value = "";
          }}
        />
        {mode === "customer_service" && (
          <button
            type="button"
            onClick={() => openPIP("eligibility")}
            className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
            title="Eligibility"
            aria-label="Eligibility"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-emerald-700"
        >
          Send
        </button>
        </div>
      </div>
    </div>
  );
}
