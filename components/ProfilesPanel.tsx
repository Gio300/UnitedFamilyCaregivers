"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";

interface ProfileRow {
  id: string;
  full_name: string;
  role: string;
  approved_at: string | null;
  caregiver_name?: string;
  clients?: { full_name: string; id: string }[];
  client_profile_id?: string;
  encounter_count?: number;
  medication_count?: number;
  allergy_count?: number;
  recent_work?: { call_reason?: string; disposition?: string; created_at: string }[];
}

export function ProfilesPanel() {
  const { setActiveClientId } = useApp();
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) setProfiles(allProfiles);
    else setProfiles(allProfiles.filter((p) => (p.full_name || "").toLowerCase().includes(q) || p.role.toLowerCase().includes(q)));
  }, [search, allProfiles]);

  const viewClient = (clientProfileId: string) => {
    setActiveClientId(clientProfileId);
    router.push("/dashboard/profile");
  };

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      // Try real profiles first
      let { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, role, approved_at")
        .order("full_name");

      // Temporary: fallback to test_profiles when no real profiles (for dev/testing)
      const useTestProfiles = !profs?.length;
      if (useTestProfiles) {
        try {
          const { data: testProfs, error } = await supabase
            .from("test_profiles")
            .select("id, full_name, role, approved_at")
            .order("full_name");
          if (!error) profs = testProfs || [];
          else profs = [];
        } catch {
          profs = [];
        }
      }

      if (!profs?.length) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const enriched: ProfileRow[] = await Promise.all(
        profs.map(async (p) => {
          const row: ProfileRow = { ...p, approved_at: p.approved_at };

          if (p.role === "client") {
            if (useTestProfiles) {
              const { data: cp } = await supabase
                .from("test_client_profiles")
                .select("id, caregiver_id")
                .eq("client_id", p.id)
                .limit(1)
                .single();
              if (cp) {
                row.client_profile_id = cp.id;
                if (cp.caregiver_id) {
                  const { data: cg } = await supabase
                    .from("test_profiles")
                    .select("full_name")
                    .eq("id", cp.caregiver_id)
                    .single();
                  row.caregiver_name = cg?.full_name || "";
                }
                // test tables don't have encounters/meds/allergies - show 0
                row.encounter_count = 0;
                row.medication_count = 0;
                row.allergy_count = 0;
              }
            } else {
              const { data: cp } = await supabase
                .from("client_profiles")
                .select("id, caregiver_id")
                .eq("user_id", p.id)
                .limit(1)
                .single();
              if (cp) {
                row.client_profile_id = cp.id;
                if (cp.caregiver_id) {
                  const { data: cg } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", cp.caregiver_id)
                    .single();
                  row.caregiver_name = cg?.full_name || "";
                }
                const [enc, med, all] = await Promise.all([
                  supabase.from("encounters").select("id", { count: "exact", head: true }).eq("client_id", cp.id),
                  supabase.from("client_medications").select("id", { count: "exact", head: true }).eq("client_id", cp.id),
                  supabase.from("client_allergies").select("id", { count: "exact", head: true }).eq("client_id", cp.id),
                ]);
                row.encounter_count = enc.error ? 0 : (enc.count ?? 0);
                row.medication_count = med.error ? 0 : (med.count ?? 0);
                row.allergy_count = all.error ? 0 : (all.count ?? 0);
              }
            }
          }

          if (p.role === "caregiver") {
            if (useTestProfiles) {
              const { data: clients } = await supabase
                .from("test_client_profiles")
                .select("full_name, id")
                .eq("caregiver_id", p.id);
              row.clients = clients || [];
            } else {
              const { data: clients } = await supabase
                .from("client_profiles")
                .select("full_name, id")
                .eq("caregiver_id", p.id);
              row.clients = clients || [];
            }
          }

          if ((p.role === "csr_admin" || p.role === "management_admin") && !useTestProfiles) {
            const { data: notes } = await supabase
              .from("call_notes")
              .select("call_reason, disposition, created_at")
              .eq("user_id", p.id)
              .order("created_at", { ascending: false })
              .limit(5);
            row.recent_work = notes || [];
          }

          return row;
        })
      );

      setAllProfiles(enriched);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const roleLabel = (r: string) =>
    r === "client" ? "Client" : r === "caregiver" ? "Caregiver" : r === "csr_admin" ? "CSR" : r === "management_admin" ? "Manager" : r;

  if (loading) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">Loading profiles…</div>
    );
  }

  if (!profiles.length) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-400">No profiles yet.</p>
        <p className="text-xs text-slate-500">Profiles appear here as users sign up or are added.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="space-y-2">
          <input
            type="search"
            placeholder="Search by name or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
          />
          <Link
            href="/signup"
            className="block w-full py-2 rounded-lg bg-emerald-600 text-white text-center text-sm font-medium hover:bg-emerald-700"
          >
            Create profile
          </Link>
        </div>
      )}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Clients, caregivers, and staff.
      </p>
      <div className="space-y-2">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs"
          >
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {p.full_name || "Unknown"}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              {roleLabel(p.role)}
              {p.approved_at ? " · Approved" : " · Pending"}
            </p>
            {p.role === "client" && p.caregiver_name && (
              <p className="text-slate-500 dark:text-slate-500 mt-1">
                Caregiver: {p.caregiver_name}
              </p>
            )}
            {p.role === "client" && (p.encounter_count !== undefined || p.medication_count !== undefined || p.allergy_count !== undefined) && (
              <p className="text-slate-500 dark:text-slate-500 mt-1">
                {(p.encounter_count ?? 0)} visits · {(p.medication_count ?? 0)} meds · {(p.allergy_count ?? 0)} allergies
              </p>
            )}
            {p.role === "client" && p.client_profile_id && (
              <button
                type="button"
                onClick={() => viewClient(p.client_profile_id!)}
                className="mt-1 text-xs text-emerald-600 hover:underline"
              >
                View detail
              </button>
            )}
            {p.role === "caregiver" && p.clients && p.clients.length > 0 && (
              <p className="text-slate-500 dark:text-slate-500 mt-1">
                Clients: {p.clients.map((c) => c.full_name).join(", ")}
              </p>
            )}
            {(p.role === "csr_admin" || p.role === "management_admin") &&
              p.recent_work &&
              p.recent_work.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
                  <p className="text-slate-500 dark:text-slate-500 font-medium mb-1">
                    Recent work
                  </p>
                  <ul className="space-y-2">
                    {p.recent_work.map((w, i) => (
                      <li key={i} className="text-slate-500 dark:text-slate-500">
                        {w.call_reason || w.disposition || "Note"} —{" "}
                        {new Date(w.created_at).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
