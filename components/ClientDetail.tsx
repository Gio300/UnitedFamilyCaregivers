"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
}

export function ClientDetail({ clientId, onBack }: ClientDetailProps) {
  const { userRole, openPIP, openCompanion } = useApp();
  const [client, setClient] = useState<{
    full_name: string;
    dob: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null>(null);
  const [medications, setMedications] = useState<{ name: string; dosage: string | null; instructions: string | null }[]>([]);
  const [allergies, setAllergies] = useState<{ allergen: string; reaction: string | null; severity: string | null }[]>([]);
  const [encounters, setEncounters] = useState<{ encounter_date: string; reason: string | null; status: string }[]>([]);
  const [appointments, setAppointments] = useState<{ title: string; start_at: string; status: string }[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Try client_profiles first, then test_client_profiles (temporary dev fallback)
      let cp = (await supabase
        .from("client_profiles")
        .select("full_name, dob, phone, email, address, city, state, zip")
        .eq("id", clientId)
        .single()).data;

      if (!cp) {
        const test = (await supabase
          .from("test_client_profiles")
          .select("full_name, dob, phone, email, address, city, state, zip")
          .eq("id", clientId)
          .single()).data;
        cp = test;
      }

      setClient(cp || null);

      // encounters, meds, allergies, docs, notes - for progress and display
      const [medRes, allRes, encRes, apptRes, docRes, noteRes] = await Promise.all([
        supabase.from("client_medications").select("name, dosage, instructions").eq("client_id", clientId),
        supabase.from("client_allergies").select("allergen, reaction, severity").eq("client_id", clientId),
        supabase.from("encounters").select("encounter_date, reason, status").eq("client_id", clientId).order("encounter_date", { ascending: false }).limit(10),
        supabase.from("appointments").select("title, start_at, status").eq("client_id", clientId).order("start_at", { ascending: true }).limit(10),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("call_notes").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      ]);
      setMedications(medRes.data || []);
      setAllergies(allRes.data || []);
      setEncounters(encRes.data || []);
      setAppointments(apptRes.data || []);
      setDocCount(docRes.count ?? 0);
      setNoteCount(noteRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, [clientId, supabase]);

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  if (!client) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-400">Client not found.</p>
        <button type="button" onClick={onBack} className="text-sm text-emerald-600 hover:underline">Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{client.full_name}</h2>
        <button type="button" onClick={onBack} className="text-sm text-emerald-600 hover:underline">Back to my profile</button>
      </div>

      {/* Progress: needs care plan doc, ID doc, notes, meds, allergies - 5 items max */}
      {(() => {
        const hasCarePlan = docCount > 0;
        const hasIdDoc = docCount > 0;
        const hasNotes = noteCount > 0;
        const hasMeds = medications.length > 0;
        const hasAllergies = allergies.length > 0;
        const done = [hasCarePlan || hasIdDoc, hasNotes, hasMeds, hasAllergies].filter(Boolean).length;
        const total = 4;
        const pct = Math.min(100, Math.round((done / total) * 100));
        return (
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
            <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-zinc-600 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-slate-600 dark:text-slate-400">{done}/{total}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Docs, notes, meds, allergies</p>
          </div>
        );
      })()}

      {(userRole === "csr_admin" || userRole === "management_admin") && (
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
          <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Eligibility (Nevada Medicaid)</p>
          <p className="text-slate-500 dark:text-slate-400 mb-2">Check via medicaid.nv.gov. Use chat: &quot;Check eligibility for @{client.full_name}&quot; with DOB and recipient ID.</p>
          <button
            type="button"
            onClick={() => {
              openPIP("eligibility");
              openCompanion();
            }}
            className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Open Eligibility
          </button>
        </div>
      )}

      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
        <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Demographics</p>
        <p className="text-slate-600 dark:text-slate-400">{client.dob ? `DOB: ${client.dob}` : ""} {client.phone ? ` · ${client.phone}` : ""}</p>
        <p className="text-slate-600 dark:text-slate-400">{client.email || ""}</p>
        <p className="text-slate-600 dark:text-slate-400">{[client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || "—"}</p>
      </div>

      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
        <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Medications ({medications.length})</p>
        {medications.length === 0 ? (
          <p className="text-slate-500">None on file</p>
        ) : (
          <ul className="space-y-1">
            {medications.map((m, i) => (
              <li key={i} className="text-slate-600 dark:text-slate-400">
                {m.name}{m.dosage ? ` — ${m.dosage}` : ""}{m.instructions ? ` · ${m.instructions}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
        <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Allergies ({allergies.length})</p>
        {allergies.length === 0 ? (
          <p className="text-slate-500">None on file</p>
        ) : (
          <ul className="space-y-1">
            {allergies.map((a, i) => (
              <li key={i} className="text-slate-600 dark:text-slate-400">
                {a.allergen}{a.reaction ? ` — ${a.reaction}` : ""}{a.severity ? ` (${a.severity})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
        <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Recent visits</p>
        {encounters.length === 0 ? (
          <p className="text-slate-500">None</p>
        ) : (
          <ul className="space-y-1">
            {encounters.map((e, i) => (
              <li key={i} className="text-slate-600 dark:text-slate-400">
                {e.encounter_date} — {e.reason || "—"} ({e.status})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
        <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Upcoming appointments</p>
        {appointments.length === 0 ? (
          <p className="text-slate-500">None</p>
        ) : (
          <ul className="space-y-1">
            {appointments.map((a, i) => (
              <li key={i} className="text-slate-600 dark:text-slate-400">
                {a.title} — {new Date(a.start_at).toLocaleString()} ({a.status})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
