"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import { fetchLiveKitToken } from "@/lib/livekit";
import { useApp, type AccentColor, type ComposerPrefill } from "@/context/AppContext";
import { DmLiveKitModal } from "@/components/DmLiveKitModal";

export type ComposerChannel = "dm" | "email" | "reminder" | "appointment" | "call";

export type ComposerRecipient = {
  id: string;
  full_name: string | null;
  role?: string | null;
  email?: string | null;
};

export const CUSTOMER_SERVICE_ID = "__customer_service__";

function accentBtn(accent: AccentColor) {
  switch (accent) {
    case "blue":
      return "bg-blue-600 hover:bg-blue-700";
    case "violet":
      return "bg-violet-600 hover:bg-violet-700";
    case "amber":
      return "bg-amber-600 hover:bg-amber-700";
    default:
      return "bg-emerald-600 hover:bg-emerald-700";
  }
}

type RpcRecipient = { id: string; full_name: string | null; role: string | null; email: string | null };

export function NewMessageComposer({
  open,
  onClose,
  initialChannel = "dm",
  initialRecipient = null,
  initialPrefill = null,
}: {
  open: boolean;
  onClose: () => void;
  initialChannel?: ComposerChannel;
  initialRecipient?: ComposerRecipient | null;
  initialPrefill?: ComposerPrefill | null;
}) {
  const { activeClientId, accentColor, userRole, openCompanion, setPendingAssistantMessage } = useApp();
  const supabase = createClient();
  const isAdmin = userRole === "csr_admin" || userRole === "management_admin";

  const [channel, setChannel] = useState<ComposerChannel>(initialChannel);
  const [recipient, setRecipient] = useState<ComposerRecipient | null>(initialRecipient);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminResults, setAdminResults] = useState<RpcRecipient[]>([]);
  const [allowedList, setAllowedList] = useState<RpcRecipient[]>([]);
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [dmBody, setDmBody] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [aptClientId, setAptClientId] = useState<string>("");
  const [aptTitle, setAptTitle] = useState("");
  const [aptStart, setAptStart] = useState("");
  const [aptNotes, setAptNotes] = useState("");
  const [emailClientId, setEmailClientId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [livekit, setLivekit] = useState<{ token: string; url: string; label: string } | null>(null);

  const resetFromProps = useCallback(() => {
    setChannel(initialChannel);
    setRecipient(initialRecipient);
    setAdminQuery("");
    setAdminResults([]);
    setMessage(null);
    setEmailTo(initialRecipient?.email || "");
    setEmailSubject("");
    setEmailBody("");
    setDmBody("");
    setReminderText("");
    setReminderAt("");
    setAptTitle("");
    setAptStart("");
    setAptNotes("");
    setEmailClientId(activeClientId || "");
    setAptClientId(activeClientId || "");
  }, [initialChannel, initialRecipient, activeClientId]);

  useEffect(() => {
    if (!open) return;
    resetFromProps();
    const p = initialPrefill;
    if (p) {
      if (p.dmBody) setDmBody(p.dmBody);
      if (p.emailSubject) setEmailSubject(p.emailSubject);
      if (p.emailBody) setEmailBody(p.emailBody);
      if (p.reminderText) setReminderText(p.reminderText);
      if (p.aptTitle) setAptTitle(p.aptTitle);
      if (p.aptNotes) setAptNotes(p.aptNotes);
    }
  }, [open, resetFromProps, initialPrefill]);

  useEffect(() => {
    if (!open || isAdmin) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("list_allowed_message_recipients");
      if (!cancelled && !error && Array.isArray(data)) {
        setAllowedList(data as RpcRecipient[]);
      } else if (!cancelled) {
        setAllowedList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isAdmin, supabase]);

  useEffect(() => {
    if (!open || !isAdmin) {
      setAdminResults([]);
      return;
    }
    const q = adminQuery.trim();
    if (q.length < 1) {
      setAdminResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("admin_search_messaging_recipients", {
        q,
        result_limit: 20,
      });
      if (!error && Array.isArray(data)) {
        setAdminResults(data as RpcRecipient[]);
      } else {
        setAdminResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [open, isAdmin, adminQuery, supabase]);

  useEffect(() => {
    if (!open || channel !== "appointment") return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("client_profiles").select("id, full_name").order("full_name").limit(300);
      if (!cancelled && data) {
        setClients(data);
        if (!aptClientId && activeClientId) setAptClientId(activeClientId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, channel, supabase, activeClientId]);

  useEffect(() => {
    if (!open || channel !== "email") return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("client_profiles").select("id, full_name").order("full_name").limit(300);
      if (!cancelled && data) {
        setClients(data);
        if (!emailClientId && activeClientId) setEmailClientId(activeClientId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, channel, supabase, activeClientId]);

  const startLiveKit = async (otherUserId: string, label: string) => {
    const apiBase = getApiBase();
    const url = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LIVEKIT_URL : "";
    if (!apiBase || !url) {
      setMessage("Set NEXT_PUBLIC_API_BASE and NEXT_PUBLIC_LIVEKIT_URL to use voice.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const tokenJwt = session?.access_token;
    if (!tokenJwt) {
      setMessage("Sign in required.");
      return;
    }
    const uid = session.user.id;
    const roomName = `dm-${[uid, otherUserId].sort().join("-")}`;
    try {
      const token = await fetchLiveKitToken(roomName, tokenJwt, apiBase);
      setLivekit({ token, url, label: `${label} · ${roomName}` });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "LiveKit token failed");
    }
  };

  const handleSubmit = async () => {
    setMessage(null);
    if (recipient?.id === CUSTOMER_SERVICE_ID) {
      if (channel === "call") {
        openCompanion();
        setPendingAssistantMessage(
          "Companion is open. Tap **Call now** to connect with the voice assistant (Kloudy). You will be in the queue for a live representative in the same voice room."
        );
        onClose();
        return;
      }
      setMessage("For live voice support, choose **Call**, pick Customer service, and send—or open Companion and use **Call now**.");
      return;
    }
    if (!recipient && channel !== "appointment") {
      setMessage("Choose a recipient.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setMessage("Sign in required.");
      return;
    }

    if (channel === "call") {
      if (!recipient) return;
      setSubmitting(true);
      try {
        await startLiveKit(recipient.id, `Call with ${recipient.full_name || "user"}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (channel === "dm") {
      if (!recipient || !dmBody.trim()) {
        setMessage("Enter a message.");
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await supabase.from("direct_messages").insert({
          from_user_id: user.id,
          to_user_id: recipient.id,
          body: dmBody.trim(),
          thread_key: "-",
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        setMessage("Direct message sent.");
        onClose();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (channel === "email") {
      const to = (emailTo || recipient?.email || "").trim();
      if (!to || !emailBody.trim()) {
        setMessage("Recipient email and body are required.");
        return;
      }
      const cid = emailClientId || activeClientId;
      if (!cid) {
        setMessage("Select a client record for this email (required for the message log).");
        return;
      }
      const apiBase = getApiBase();
      if (!apiBase) {
        setMessage("API base not configured.");
        return;
      }
      setSubmitting(true);
      try {
        const tokenJwt = session.access_token;
        const res = await fetch(`${apiBase}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenJwt}` },
          body: JSON.stringify({
            client_id: cid,
            recipient_email: to,
            subject: emailSubject || "(No subject)",
            body: emailBody,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          setMessage(data?.error || "Email send failed");
          return;
        }
        setMessage("Email sent.");
        onClose();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (channel === "reminder") {
      if (!recipient || !reminderText.trim() || !reminderAt) {
        setMessage("Recipient, text, and time are required.");
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await supabase.from("reminders").insert({
          creator_id: user.id,
          target_user_id: recipient.id,
          text: reminderText.trim(),
          remind_at: new Date(reminderAt).toISOString(),
          client_id: activeClientId || null,
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        setMessage("Reminder saved.");
        onClose();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (channel === "appointment") {
      const cid = aptClientId || activeClientId;
      if (!cid || !aptTitle.trim() || !aptStart) {
        setMessage("Client, title, and start time are required.");
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await supabase.from("appointments").insert({
          client_id: cid,
          caregiver_id: userRole === "caregiver" || isAdmin ? user.id : null,
          title: aptTitle.trim(),
          start_at: new Date(aptStart).toISOString(),
          duration_minutes: 60,
          notes: aptNotes.trim() || null,
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        setMessage("Appointment scheduled.");
        onClose();
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <>
      {open && (
      <div
        className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <div
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-4 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New message</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["dm", "DM"],
                ["email", "Email"],
                ["reminder", "Reminder"],
                ["appointment", "Appointment"],
                ["call", "Call"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setChannel(id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  channel === id
                    ? `${accentBtn(accentColor)} text-white`
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {channel !== "appointment" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">To</label>
              {isAdmin ? (
                <>
                  <input
                    type="text"
                    value={adminQuery}
                    onChange={(e) => setAdminQuery(e.target.value)}
                    placeholder="Search name…"
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                  <ul className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 divide-y divide-slate-100 dark:divide-zinc-800">
                    {adminResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-slate-100"
                          onClick={() => {
                            setRecipient({ id: r.id, full_name: r.full_name, role: r.role, email: r.email });
                            setEmailTo(r.email || "");
                            setAdminQuery("");
                            setAdminResults([]);
                          }}
                        >
                          {r.full_name || "Unknown"} {r.email ? `· ${r.email}` : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <ul className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 divide-y divide-slate-100 dark:divide-zinc-800">
                  <li>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-slate-100"
                      onClick={() =>
                        setRecipient({ id: CUSTOMER_SERVICE_ID, full_name: "Customer service", email: null })
                      }
                    >
                      Customer service (queue coming soon)
                    </button>
                  </li>
                  {allowedList.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-slate-100"
                        onClick={() => {
                          setRecipient({ id: r.id, full_name: r.full_name, role: r.role, email: r.email });
                          setEmailTo(r.email || "");
                        }}
                      >
                        {r.full_name || "Unknown"} {r.email ? `· ${r.email}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {recipient && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Selected: <strong>{recipient.full_name}</strong>
                  {recipient.id === CUSTOMER_SERVICE_ID ? "" : ` (${recipient.id.slice(0, 8)}…)`}
                </p>
              )}
            </div>
          )}

          {channel === "dm" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
              <textarea
                value={dmBody}
                onChange={(e) => setDmBody(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              {recipient && recipient.id !== CUSTOMER_SERVICE_ID && (
                <button
                  type="button"
                  onClick={() => startLiveKit(recipient.id, `Voice with ${recipient.full_name || "user"}`)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Start voice (LiveKit)
                </button>
              )}
            </div>
          )}

          {channel === "email" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client (for log)</label>
              <select
                value={emailClientId}
                onChange={(e) => setEmailClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">To email</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Body</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
            </div>
          )}

          {channel === "reminder" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reminder text</label>
              <input
                type="text"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">When</label>
              <input
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
            </div>
          )}

          {channel === "appointment" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client</label>
              <select
                value={aptClientId}
                onChange={(e) => setAptClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
              <input
                type="text"
                value={aptTitle}
                onChange={(e) => setAptTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Start</label>
              <input
                type="datetime-local"
                value={aptStart}
                onChange={(e) => setAptStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
              <textarea
                value={aptNotes}
                onChange={(e) => setAptNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
            </div>
          )}

          {channel === "call" && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose a contact, then connect with LiveKit voice. The other person uses the same room from their account.
            </p>
          )}

          {message && <p className="text-sm text-amber-600 dark:text-amber-400">{message}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${accentBtn(accentColor)}`}
            >
              {submitting ? "Working…" : channel === "call" ? "Join call" : "Send"}
            </button>
          </div>
        </div>
      </div>
      )}

      {livekit && (
        <DmLiveKitModal
          open
          serverUrl={livekit.url}
          token={livekit.token}
          roomLabel={livekit.label}
          onClose={() => setLivekit(null)}
        />
      )}
    </>
  );
}
