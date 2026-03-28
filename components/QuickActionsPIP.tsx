"use client";

import { useApp } from "@/context/AppContext";

const LATE_TEMPLATE =
  "I'm running late for my upcoming appointment. Please let the other party know and help me reschedule if needed.";

export function QuickActionsPIP() {
  const {
    closePIP,
    requestComposerChannel,
    setMode,
    setPendingUserComposerText,
    setPendingAssistantMessage,
    activeClientId,
  } = useApp();

  const row =
    "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-600 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors";

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100 max-w-md">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Shortcuts open the right composer or fill the main chat so you can edit and send.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={row}
          onClick={() => {
            requestComposerChannel("appointment", {
              aptTitle: "Running late / reschedule",
              aptNotes: LATE_TEMPLATE,
            });
            closePIP();
          }}
        >
          Running late (appointment)
        </button>
        <button
          type="button"
          className={row}
          onClick={() => {
            requestComposerChannel("dm", { dmBody: LATE_TEMPLATE });
            closePIP();
          }}
        >
          Notify by message (running late)
        </button>
        <button
          type="button"
          className={row}
          onClick={() => {
            requestComposerChannel("email", {
              emailSubject: "Running late",
              emailBody: LATE_TEMPLATE,
            });
            closePIP();
          }}
        >
          Notify by email
        </button>
        <button
          type="button"
          className={row}
          onClick={() => {
            setMode("profiles");
            setPendingAssistantMessage(
              "Profiles mode: pick a client row to set who you are viewing, then return to chat."
            );
            closePIP();
          }}
        >
          Switch client (Profiles)
        </button>
        <button
          type="button"
          className={row}
          onClick={() => {
            requestComposerChannel("reminder", {
              reminderText: activeClientId ? "Follow up with active client" : "Reminder: follow up",
            });
            closePIP();
          }}
        >
          Quick reminder
        </button>
        <button
          type="button"
          className={row}
          onClick={() => {
            setPendingUserComposerText("**start checklist**");
            setPendingAssistantMessage(
              "Sandata-style checklist: send the line we dropped into the composer to start the guided flow for your current mode."
            );
            closePIP();
          }}
        >
          Start intake / checklist
        </button>
      </div>
    </div>
  );
}
