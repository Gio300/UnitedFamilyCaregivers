"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { useApp, type CompanionSuggestedAction } from "@/context/AppContext";
import { CustomerSupportVoicePanel } from "@/components/CustomerSupportVoicePanel";

function tailLines(text: string, maxLines: number): string[] {
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.slice(-maxLines);
}

const HEURISTIC_GUIDANCE = [
  "You are still in queue for a live agent. If anything comes to mind for your representative, say it to the voice assistant or type in the main chat. That does not remove your place in line.",
  "The main chat below shows text updates. You can keep holding, or tap Schedule a call if you prefer a call-back instead.",
  "While you wait, the voice assistant may help with simple questions. A human will still receive the notes we collect here.",
];

type CompanionLayout = "inline" | "sheet";

export function CompanionPanel({ layout = "inline" }: { layout?: CompanionLayout }) {
  const {
    rightSidebarOpen,
    setRightSidebarOpen,
    activeClientId,
    setActiveClientId,
    userRole,
    companionFlow,
    setCompanionFlow,
    companionSummary,
    voiceCaptionTail,
    appendCompanionNote,
    appendVoiceCaption,
    appendCompanionDecision,
    clearCompanionContext,
    requestComposerChannel,
    queueAgentAvailable,
    ivrSessionUnresolved,
    setPendingAssistantMessage,
    companionVoiceSessionActive,
    companionGuidance,
    pushCompanionGuidance,
    companionGuidanceGoBack,
    companionGuidanceGoForward,
    mode,
    companionDecisions,
    companionSuggestedActions,
    setCompanionSuggestedActions,
    applyCompanionAction,
    lastChatSnippetForCompanion,
  } = useApp();
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const [listenerVerbose, setListenerVerbose] = useState(false);
  const supabase = createClient();
  const voiceAnchorRef = useRef<HTMLDivElement>(null);
  const heuristicIdxRef = useRef(0);
  const captionLenBaselineRef = useRef(0);
  const lastLlmAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeClientId) {
        if (!cancelled) setActiveClientName(null);
        return;
      }
      if (!cancelled) setActiveClientName(null);
      const { data, error } = await supabase
        .from("client_profiles")
        .select("full_name")
        .eq("id", activeClientId)
        .single();
      if (cancelled) return;
      if (!error && data?.full_name) {
        setActiveClientName(data.full_name);
        return;
      }
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", activeClientId).single();
      if (!cancelled) setActiveClientName(p?.full_name ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeClientId, supabase]);

  useEffect(() => {
    if (!companionVoiceSessionActive) {
      captionLenBaselineRef.current = 0;
      heuristicIdxRef.current = 0;
      return;
    }
    captionLenBaselineRef.current = voiceCaptionTail.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot baseline only when voice session starts
  }, [companionVoiceSessionActive]);

  useEffect(() => {
    if (!companionVoiceSessionActive) return;
    const id = window.setInterval(() => {
      const msg = HEURISTIC_GUIDANCE[heuristicIdxRef.current % HEURISTIC_GUIDANCE.length];
      heuristicIdxRef.current += 1;
      pushCompanionGuidance(msg);
    }, 120_000);
    return () => clearInterval(id);
  }, [companionVoiceSessionActive, pushCompanionGuidance]);

  useEffect(() => {
    if (!companionVoiceSessionActive || !voiceCaptionTail) return;
    const len = voiceCaptionTail.length;
    const base = captionLenBaselineRef.current;
    if (len - base > 120) {
      captionLenBaselineRef.current = len;
      pushCompanionGuidance(
        "We are still gathering details from your voice session for your representative. You remain on hold for a live agent."
      );
    }
  }, [voiceCaptionTail, companionVoiceSessionActive, pushCompanionGuidance]);

  const fetchCompanionOrchestrate = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    const now = Date.now();
    if (now - lastLlmAtRef.current < 35000) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    lastLlmAtRef.current = Date.now();
    const base = apiBase.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/companion-orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        chatSnippet: lastChatSnippetForCompanion.slice(-2000),
        voiceSnippet: voiceCaptionTail.slice(-2500),
        companionDecisions,
        companionSummary: companionSummary.slice(-2000),
        queueAgentAvailable,
        mode,
        role: userRole,
        activeClientId,
      }),
    });
    if (!res.ok) return;
    const data = (await res.json().catch(() => ({}))) as {
      guidance?: string;
      actions?: CompanionSuggestedAction[];
    };
    const g = typeof data.guidance === "string" ? data.guidance.trim() : "";
    if (g) pushCompanionGuidance(g);
    if (Array.isArray(data.actions) && data.actions.length) {
      setCompanionSuggestedActions(
        data.actions.filter((a) => a && typeof a.id === "string" && typeof a.label === "string")
      );
    }
  }, [
    voiceCaptionTail,
    companionDecisions,
    companionSummary,
    queueAgentAvailable,
    mode,
    userRole,
    activeClientId,
    pushCompanionGuidance,
    setCompanionSuggestedActions,
    supabase,
    lastChatSnippetForCompanion,
  ]);

  useEffect(() => {
    if (!rightSidebarOpen) {
      setCompanionSuggestedActions([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetchCompanionOrchestrate();
    }, 1200);
    return () => clearTimeout(t);
  }, [rightSidebarOpen, mode, userRole, activeClientId, fetchCompanionOrchestrate, setCompanionSuggestedActions]);

  useEffect(() => {
    if (!companionVoiceSessionActive || !voiceCaptionTail.trim()) return;
    const t = window.setTimeout(() => {
      void fetchCompanionOrchestrate();
    }, 22_000);
    return () => clearTimeout(t);
  }, [voiceCaptionTail, companionVoiceSessionActive, fetchCompanionOrchestrate]);

  useEffect(() => {
    if (!rightSidebarOpen || !lastChatSnippetForCompanion.trim()) return;
    const t = window.setTimeout(() => {
      void fetchCompanionOrchestrate();
    }, 2800);
    return () => clearTimeout(t);
  }, [lastChatSnippetForCompanion, rightSidebarOpen, fetchCompanionOrchestrate]);

  const isAdmin = userRole === "csr_admin" || userRole === "management_admin";

  const captionLines = tailLines(voiceCaptionTail, 6);
  const summaryLines = tailLines(companionSummary, 6);
  const showListener = captionLines.length > 0 || summaryLines.length > 0;
  const listenerSummaryLine = useMemo(() => {
    if (!showListener) return "";
    if (captionLines.length && summaryLines.length) {
      return "Voice and notes are being saved for your representative.";
    }
    if (captionLines.length) {
      return "Voice is on — we capture what you say for your representative.";
    }
    return "A short note was added for your representative.";
  }, [showListener, captionLines.length, summaryLines.length]);
  const showSuggested = voiceCaptionTail.trim().length > 0 || companionFlow !== null;
  const showReceiveCallback = queueAgentAvailable === false && ivrSessionUnresolved;

  const guidanceText =
    companionGuidance.index >= 0 && companionGuidance.history[companionGuidance.index]
      ? companionGuidance.history[companionGuidance.index]
      : "";

  const onScheduleCall = () => {
    setCompanionFlow("appointment_intent");
    appendCompanionNote("User chose Schedule a call from Companion (appointment composer).");
    appendCompanionDecision("Schedule a call (appointment composer opened).");
    requestComposerChannel("appointment");
  };

  const onReceiveCallback = () => {
    setCompanionFlow("callback_requested");
    appendCompanionNote(
      "User chose Receive a callback: no live agent was available and voice help did not resolve the issue. Opened appointment scheduler to arrange a call-back."
    );
    appendCompanionDecision("Receive a callback → appointment scheduling (escalation).");
    setPendingAssistantMessage(
      "You chose to receive a call back. Use the appointment scheduler that opened to pick a time; a representative will reach out through the app when possible. You can add details in chat."
    );
    requestComposerChannel("appointment");
  };

  const onCallNow = () => {
    appendCompanionNote("User chose Call now from Companion (voice below).");
    appendCompanionDecision("Call now (voice session).");
    voiceAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const onAddContextNote = () => {
    appendCompanionNote("Companion shortcut: user adding context — follow up in chat if needed.");
    appendCompanionDecision("Add context note (shortcut).");
  };

  const onOpenEmailComposer = () => {
    appendCompanionNote("User opened email composer from Companion.");
    appendCompanionDecision("Open email composer.");
    requestComposerChannel("email");
  };

  if (!rightSidebarOpen && layout === "inline") return null;

  const canGuidanceBack = companionGuidance.index > 0;
  const canGuidanceForward = companionGuidance.index < companionGuidance.history.length - 1;

  const shellClass =
    layout === "sheet"
      ? "flex h-full min-h-0 w-full max-h-full flex-col overflow-hidden border-0 bg-white dark:bg-zinc-900/95"
      : "flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-zinc-700/50 dark:bg-zinc-900/95";

  return (
    <aside className={shellClass} aria-label="Companion">
      <div className="p-3 border-b border-slate-200 dark:border-zinc-700/50 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Companion</h3>
          <button
            type="button"
            onClick={() => setRightSidebarOpen(false)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div data-ufci-companion-body className="flex-1 overflow-y-auto p-3 space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Tips and shortcuts for waiting on a rep or moving work forward. Use the main chat to run tools and full
          answers — Companion only nudges next steps.
        </p>

        {isAdmin && (
          <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/80 text-xs">
            {activeClientId ? (
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  Viewing: <strong className="text-slate-900 dark:text-slate-100">{activeClientName ?? "…"}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveClientId(null)}
                  className="shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">No profile selected</span>
            )}
          </div>
        )}

        {guidanceText && (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/25 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Companion guide
              </span>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  disabled={!canGuidanceBack}
                  onClick={companionGuidanceGoBack}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/80 dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canGuidanceForward}
                  onClick={companionGuidanceGoForward}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/80 dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 disabled:opacity-40"
                >
                  Forward
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{guidanceText}</p>
          </div>
        )}

        {companionSuggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {companionSuggestedActions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => applyCompanionAction(a)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/40"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {showListener && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
              What we&apos;re hearing
            </h4>
            {!listenerVerbose ? (
              <div className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-950/50 px-2.5 py-2 text-sm text-slate-700 dark:text-slate-200">
                <p className="leading-relaxed">{listenerSummaryLine}</p>
                <button
                  type="button"
                  onClick={() => setListenerVerbose(true)}
                  className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Show technical details
                </button>
              </div>
            ) : (
              <div>
                <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-950/50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-1">
                  {captionLines.length > 0 && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500">Voice · </span>
                      {captionLines.map((line, i) => (
                        <div key={`c-${i}`} className="truncate" title={line}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                  {summaryLines.length > 0 && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500">Notes · </span>
                      {summaryLines.map((line, i) => (
                        <div key={`s-${i}`} className="truncate" title={line}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setListenerVerbose(false)}
                  className="mt-1 text-xs text-slate-500 hover:underline"
                >
                  Hide details
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onScheduleCall}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-600 hover:bg-slate-200 dark:hover:bg-zinc-700"
          >
            Schedule a call
          </button>
          <button
            type="button"
            onClick={onCallNow}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Call now
          </button>
        </div>

        {companionFlow && (
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>
              Active:{" "}
              {companionFlow === "callback_requested"
                ? "Call-back (via scheduler)"
                : "Appointment scheduling"}
            </span>
            <button type="button" onClick={clearCompanionContext} className="text-slate-500 hover:underline shrink-0">
              Clear
            </button>
          </div>
        )}

        <div ref={voiceAnchorRef}>
          <CustomerSupportVoicePanel
            embedded
            onAgentSpeech={(text) => {
              appendVoiceCaption(text);
            }}
          />
        </div>

        {showReceiveCallback && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20 px-2 py-2 text-xs text-amber-950 dark:text-amber-100">
            <p className="mb-2 leading-relaxed">
              No agent is available to take your call right now, and it sounds like the voice assistant did not fully
              resolve your issue. You can schedule a call-back using the same scheduler as &quot;Schedule a call.&quot;
            </p>
            <button
              type="button"
              onClick={onReceiveCallback}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white"
            >
              Receive a callback
            </button>
          </div>
        )}

        {showSuggested && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={onAddContextNote}
              className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-600"
            >
              Add context note
            </button>
            <button
              type="button"
              onClick={onOpenEmailComposer}
              className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-600"
            >
              Open email composer
            </button>
          </div>
        )}

        <Link
          href="/dashboard/voice-lab"
          className="block text-center text-xs text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
        >
          Voice lab (advanced)
        </Link>
      </div>
    </aside>
  );
}
