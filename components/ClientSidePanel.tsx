"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";

export function ClientSidePanel() {
  const { activeClientId, setActiveClientId } = useApp();
  const [client, setClient] = useState<{ full_name: string } | null>(null);
  const [medications, setMedications] = useState<{ name: string }[]>([]);
  const [allergies, setAllergies] = useState<{ allergen: string }[]>([]);
  const [encounters, setEncounters] = useState<{ encounter_date: string; reason: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!activeClientId) {
      setClient(null);
      setMedications([]);
      setAllergies([]);
      setEncounters([]);
      return;
    }
    setLoading(true);
    (async () => {
      const { data: cp } = await supabase
        .from("client_profiles")
        .select("full_name")
        .eq("id", activeClientId)
        .single();
      setClient(cp || null);

      const [medRes, allRes, encRes] = await Promise.all([
        supabase.from("client_medications").select("name").eq("client_id", activeClientId),
        supabase.from("client_allergies").select("allergen").eq("client_id", activeClientId),
        supabase.from("encounters").select("encounter_date, reason").eq("client_id", activeClientId).order("encounter_date", { ascending: false }).limit(5),
      ]);
      setMedications(medRes.data || []);
      setAllergies(allRes.data || []);
      setEncounters(encRes.data || []);
      setLoading(false);
    })();
  }, [activeClientId, supabase]);

  if (!activeClientId) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">No client selected.</p>
        <p className="text-xs text-slate-500">Select a client from Profiles to view meds, allergies, and visits.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{client?.full_name || "Client"}</p>
        <button type="button" onClick={() => setActiveClientId(null)} className="text-xs text-slate-500 hover:underline">Clear</button>
      </div>
      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
        <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">Medications</p>
        {medications.length === 0 ? <p className="text-slate-500">None</p> : <ul className="space-y-0.5">{medications.map((m, i) => <li key={i}>{m.name}</li>)}</ul>}
      </div>
      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
        <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">Allergies</p>
        {allergies.length === 0 ? <p className="text-slate-500">None</p> : <ul className="space-y-0.5">{allergies.map((a, i) => <li key={i}>{a.allergen}</li>)}</ul>}
      </div>
      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
        <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">Recent visits</p>
        {encounters.length === 0 ? <p className="text-slate-500">None</p> : <ul className="space-y-0.5">{encounters.map((e, i) => <li key={i}>{e.encounter_date} — {e.reason || "—"}</li>)}</ul>}
      </div>
    </div>
  );
}
