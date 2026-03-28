"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";

type DevProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  approved_at: string | null;
  account_disabled: boolean | null;
  created_at: string | null;
};

export default function DeveloperConsolePage() {
  const router = useRouter();
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "denied" | "ready">("loading");
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [profiles, setProfiles] = useState<DevProfile[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [allowEmail, setAllowEmail] = useState("");

  const load = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      setErr("Set NEXT_PUBLIC_API_BASE");
      setPhase("denied");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.replace("/login");
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("account_disabled")
      .eq("id", session.user.id)
      .single();
    if (prof?.account_disabled) {
      await supabase.auth.signOut();
      router.replace("/login?reason=disabled");
      return;
    }
    const jwt = session.access_token;
    const base = apiBase.replace(/\/+$/, "");
    const st = await fetch(`${base}/api/dev/status`, { headers: { Authorization: `Bearer ${jwt}` } });
    if (st.status === 403) {
      setPhase("denied");
      return;
    }
    if (!st.ok) {
      setErr(`Status ${st.status}`);
      setPhase("denied");
      return;
    }
    setStatus(await st.json().catch(() => ({})));
    const pr = await fetch(`${base}/api/dev/profiles?limit=100`, { headers: { Authorization: `Bearer ${jwt}` } });
    const prBody = await pr.json().catch(() => ({}));
    if (!pr.ok) {
      setErr(typeof prBody.error === "string" ? prBody.error : "profiles failed");
      setProfiles([]);
    } else {
      setErr(null);
      setProfiles(Array.isArray(prBody.profiles) ? prBody.profiles : []);
    }
    setPhase("ready");
  }, [router, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(userId: string) {
    const apiBase = getApiBase();
    if (!apiBase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) return;
    setBusyId(userId);
    try {
      const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/dev/profile-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setErr(typeof b.error === "string" ? b.error : "approve failed");
      } else {
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function setDisabled(userId: string, disabled: boolean) {
    const apiBase = getApiBase();
    if (!apiBase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) return;
    setBusyId(`${userId}-${disabled}`);
    try {
      const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/dev/profile-disabled`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ userId, disabled }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setErr(typeof b.error === "string" ? b.error : "update failed");
      } else {
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function addAllowEmail() {
    const apiBase = getApiBase();
    if (!apiBase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) return;
    setBusyId("allow");
    try {
      const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/dev/allow-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ email: allowEmail.trim() }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof b.error === "string" ? b.error : "allow-email failed");
      } else {
        setAllowEmail("");
        setErr(null);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading developer console…</p>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 space-y-4">
        <h1 className="text-xl font-semibold">Developer console</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          You are signed in, but this account is not on the developer allowlist. Set{" "}
          <code className="text-sm bg-zinc-200 dark:bg-zinc-800 px-1 rounded">DEVELOPER_ALLOW_EMAILS</code> on the AI
          Gateway or add your email via{" "}
          <code className="text-sm bg-zinc-200 dark:bg-zinc-800 px-1 rounded">developer_allowlist</code> (service
          role).
        </p>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Link href="/dashboard" className="text-emerald-600 dark:text-emerald-400 underline text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Developer console</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Self-hosted use (e.g. <code className="text-xs">npm run dev:developer</code>). Gateway enforces access.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Dashboard
        </Link>
      </div>

      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2 text-sm">
        <h2 className="font-medium">Gateway status</h2>
        <pre className="text-xs bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg overflow-x-auto">
          {JSON.stringify(status, null, 2)}
        </pre>
        <p className="text-xs text-zinc-500">
          Queue health: <code className="text-zinc-700 dark:text-zinc-300">GET …/api/support-queue/waiting</code>{" "}
          (CSR JWT). Telephony: <code className="text-zinc-700 dark:text-zinc-300">GET …/api/telephony/lines</code>.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="font-medium text-sm">Add developer email (Supabase table)</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={allowEmail}
            onChange={(e) => setAllowEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 text-sm"
          />
          <button
            type="button"
            disabled={busyId === "allow" || !allowEmail.trim()}
            onClick={() => void addAllowEmail()}
            className="px-4 py-2 rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
          >
            {busyId === "allow" ? "Saving…" : "Allow email"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 font-medium text-sm">Recent profiles</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Approved</th>
                <th className="px-3 py-2 font-medium">Disabled</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2">{p.full_name || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.role || "—"}</td>
                  <td className="px-3 py-2 text-xs">{p.approved_at ? "yes" : "no"}</td>
                  <td className="px-3 py-2 text-xs">{p.account_disabled ? "yes" : "no"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void approve(p.id)}
                        className="text-xs px-2 py-1 rounded bg-emerald-600 text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === `${p.id}-true`}
                        onClick={() => void setDisabled(p.id, true)}
                        className="text-xs px-2 py-1 rounded bg-zinc-600 text-white disabled:opacity-50"
                      >
                        Disable
                      </button>
                      <button
                        type="button"
                        disabled={busyId === `${p.id}-false`}
                        onClick={() => void setDisabled(p.id, false)}
                        className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 disabled:opacity-50"
                      >
                        Enable
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
