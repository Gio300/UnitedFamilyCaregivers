"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";

const MEDICAID_URL = "https://www.medicaid.nv.gov/hcp/provider/Home/tabid/135/Default.aspx";

export function EligibilitySidePanel() {
  const { userRole, openPIP } = useApp();
  const [mfaCode, setMfaCode] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (userRole !== "csr_admin" && userRole !== "management_admin") return;
    const apiBase = getApiBase();
    if (!apiBase) {
      setMfaCode("—");
      setLoading(false);
      return;
    }
    async function fetchTotp() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${apiBase}/api/eligibility/totp`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        setMfaCode(data.code || "—");
      } catch {
        setMfaCode("—");
      } finally {
        setLoading(false);
      }
    }
    fetchTotp();
    const interval = setInterval(fetchTotp, 10000);
    return () => clearInterval(interval);
  }, [userRole, supabase]);

  async function openPortal() {
    const apiBase = getApiBase();
    if (!apiBase) {
      window.open(MEDICAID_URL, "_blank");
      return;
    }
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${apiBase}/api/eligibility/open-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!data.success) {
        window.open(MEDICAID_URL, "_blank");
      }
    } catch {
      window.open(MEDICAID_URL, "_blank");
    } finally {
      setPortalLoading(false);
    }
  }

  if (userRole !== "csr_admin" && userRole !== "management_admin") return null;

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-auto shrink-0">
      <div className="p-4 space-y-4">
        <h3 className="font-medium text-slate-800 dark:text-slate-200">Nevada Medicaid Eligibility</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          TOTP code for portal login. Open portal for manual check or use AI chat to check eligibility for a client.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Login code (MFA)</label>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 font-mono text-lg">
              {loading ? "…" : mfaCode}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(mfaCode)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 text-sm"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Refreshes every 10s</p>
        </div>
        <a
          href={MEDICAID_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-emerald-600 dark:text-emerald-400 underline break-all"
        >
          {MEDICAID_URL}
        </a>
        <button
          type="button"
          onClick={openPortal}
          disabled={portalLoading}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {portalLoading ? "Opening…" : "Open Portal (auto-login)"}
        </button>
        <p className="text-xs text-slate-500">
          In chat: &quot;Check eligibility for @ClientName&quot; with DOB and recipient ID or SSN.
        </p>
      </div>
    </aside>
  );
}
