"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { CustomerSupportVoicePanel } from "@/components/CustomerSupportVoicePanel";

type ProfileRow = { full_name: string | null; role: string | null };

export default function CustomerSupportPage() {
  const { userRole, accentColor, appendVoiceCaption } = useApp();
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [assistInput, setAssistInput] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [companionBlocks, setCompanionBlocks] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      setEmail(session.user.email ?? null);
      const { data } = await supabase.from("profiles").select("full_name, role").eq("id", session.user.id).single();
      if (!cancelled && data) setProfile(data as ProfileRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    const tips = [
      "You can use the main chat (#) anytime for many questions—no call required.",
      "This page is for testing voice (LiveKit). Text below uses your AI Gateway (e.g. Ollama on your PC) to reduce cloud voice cost.",
      "We do not provide medical advice. For health concerns, contact your clinician or emergency services if urgent.",
    ];
    setCompanionBlocks((prev) => (prev.length === 0 ? tips : prev));
  }, []);

  const onAgentSpeech = useCallback((text: string) => {
    appendVoiceCaption(text);
    const line = `Voice agent: ${text}`.slice(0, 2000);
    setCompanionBlocks((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === line) {
        return prev;
      }
      return [...prev, line].slice(-80);
    });
  }, [appendVoiceCaption]);

  const sendTextAssist = async () => {
    const msg = assistInput.trim();
    if (!msg) return;
    const apiBase = getApiBase();
    if (!apiBase) {
      setAssistError("Set NEXT_PUBLIC_API_BASE to your AI Gateway.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setAssistError("Sign in required.");
      return;
    }
    setAssistError(null);
    setAssistBusy(true);
    const prior = chatHistory.map(({ role, content }) => ({ role, content }));
    const chatUrl = `${apiBase.replace(/\/+$/, "")}/api/chat`;
    try {
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          history: prior,
          userContext: {
            page: "customer_support_voice_prep",
            userRole: userRole ?? undefined,
            profileName: profile?.full_name ?? undefined,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : res.statusText);
      }
      const content = typeof data?.content === "string" ? data.content : "";
      const assistantLine = content || "(No response)";
      setChatHistory([...prior, { role: "user", content: msg }, { role: "assistant", content: assistantLine }]);
      setCompanionBlocks((prev) => [...prev, `Text assist: ${assistantLine}`.slice(0, 2000)]);
      setAssistInput("");
    } catch (e) {
      setAssistError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setAssistBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-black">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Voice lab</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Full-width test grid for LiveKit + gateway. Main app: Dashboard → <span className="font-medium">/dashboard/customer-support</span> (chat + Companion). Accent: {accentColor}.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          Not medical advice. For account and app support only. Use the in-app chat for many issues without a call.
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <CustomerSupportVoicePanel onAgentSpeech={onAgentSpeech} />
            <div className="rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Account context</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Shown here so you (and later the AI) can ground answers. Voice IVR will use similar data from your
                session.
              </p>
              <ul className="text-sm text-slate-800 dark:text-slate-200 space-y-1 list-disc list-inside">
                <li>Name: {profile?.full_name || "—"}</li>
                <li>Email: {email || "—"}</li>
                <li>Role: {profile?.role || userRole || "—"}</li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">On-screen companion</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                What the LiveKit voice agent says (caption stream) appears here as{" "}
                <span className="font-medium">Voice agent: …</span> while the session is connected. Text assist below is
                separate (AI Gateway).
              </p>
              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2 max-h-72 overflow-y-auto">
                {companionBlocks.map((b, i) => (
                  <li
                    key={i}
                    className="border-b border-slate-100 dark:border-zinc-800 pb-2 last:border-0 whitespace-pre-wrap"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Text assist (AI Gateway)</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Uses your existing gateway (e.g. PC Ollama)—not LiveKit TTS—to reduce cloud cost. Ask for a short summary
                or what to say next.
              </p>
              {assistError && <p className="text-sm text-red-600 dark:text-red-400">{assistError}</p>}
              <textarea
                value={assistInput}
                onChange={(e) => setAssistInput(e.target.value)}
                rows={3}
                placeholder="e.g. Summarize what I should tell the agent about my billing issue…"
                className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={assistBusy}
                onClick={sendTextAssist}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-900 dark:bg-zinc-200 dark:hover:bg-white text-white dark:text-slate-900 disabled:opacity-50"
              >
                {assistBusy ? "Sending…" : "Send to gateway"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
