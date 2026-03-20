"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AppointmentRow {
  id: string;
  title: string;
  start_at: string;
  status: string;
  client_id: string;
  client_name?: string;
}

export function AppointmentsSidePanel() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("appointments")
        .select("id, title, start_at, status, client_id")
        .gte("start_at", new Date().toISOString().slice(0, 10))
        .order("start_at", { ascending: true })
        .limit(15);
      if (data?.length) {
        const clientIds = [...new Set(data.map((a) => a.client_id))];
        const { data: clients } = await supabase
          .from("client_profiles")
          .select("id, full_name")
          .in("id", clientIds);
        const nameMap = Object.fromEntries((clients || []).map((c) => [c.id, c.full_name]));
        setAppointments(data.map((a) => ({ ...a, client_name: nameMap[a.client_id] })));
      } else {
        setAppointments([]);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upcoming appointments</p>
      {appointments.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">No upcoming appointments. Use Appointments mode in chat to schedule.</p>
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => (
            <li key={a.id} className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
              <p className="font-medium text-slate-800 dark:text-slate-200">{a.title}</p>
              <p className="text-slate-600 dark:text-slate-400">{a.client_name || "—"} · {new Date(a.start_at).toLocaleString()}</p>
              <p className="text-slate-500">{a.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
