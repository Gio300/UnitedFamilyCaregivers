"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
}

export function ClientDetail({ clientId, onBack }: ClientDetailProps) {
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
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: cp } = await supabase
        .from("client_profiles")
        .select("full_name, dob, phone, email, address, city, state, zip")
        .eq("id", clientId)
        .single();
      setClient(cp || null);

      const [medRes, allRes, encRes, apptRes] = await Promise.all([
        supabase.from("client_medications").select("name, dosage, instructions").eq("client_id", clientId),
        supabase.from("client_allergies").select("allergen, reaction, severity").eq("client_id", clientId),
        supabase.from("encounters").select("encounter_date, reason, status").eq("client_id", clientId).order("encounter_date", { ascending: false }).limit(10),
        supabase.from("appointments").select("title, start_at, status").eq("client_id", clientId).order("start_at", { ascending: true }).limit(10),
      ]);
      setMedications(medRes.data || []);
      setAllergies(allRes.data || []);
      setEncounters(encRes.data || []);
      setAppointments(apptRes.data || []);
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
