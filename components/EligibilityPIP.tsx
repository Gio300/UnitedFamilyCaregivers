"use client";

import { useState, useEffect } from "react";
import { PIPWindow } from "./PIPWindow";
import { TelephonyOutboundControls } from "@/components/TelephonyOutboundControls";
import { getApiBase } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const MEDICAID_URL = "https://www.medicaid.nv.gov/hcp/provider/Home/tabid/135/Default.aspx";

interface EligibilityPIPProps {
  onClose: () => void;
}

export function EligibilityPIP({ onClose }: EligibilityPIPProps) {
  const [mfaCode, setMfaCode] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createClient();
  const isStaffAdmin = userRole === "csr_admin" || userRole === "management_admin";

  async function fetchTotp() {
    const apiBase = getApiBase();
    if (!apiBase) {
      setMfaCode("—");
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    fetchTotp();
    const interval = setInterval(fetchTotp, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setUserRole(data?.role ?? null);
    });
  }, [supabase]);

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

  return (
    <PIPWindow title="Eligibility – Nevada Medicaid" onClose={onClose} defaultWidth={380} defaultHeight={340}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Login code (MFA)</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-slate-100 font-mono text-lg">{loading ? "…" : mfaCode}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(mfaCode)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Refreshes every 10s</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
          <a href={MEDICAID_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline text-sm break-all">
            {MEDICAID_URL}
          </a>
        </div>
        <p className="text-sm text-slate-600">
          Copy the MFA code, open the portal, enter credentials, paste the code when prompted.
        </p>
        <button
          type="button"
          onClick={openPortal}
          disabled={portalLoading}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {portalLoading ? "Opening…" : "Open Portal (auto-login)"}
        </button>

        {isStaffAdmin && (
          <div className="pt-4 border-t border-slate-200 dark:border-zinc-600">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">CSR — dial allowlisted line</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Starts a LiveKit room with outbound SIP (Nevada Medicaid line appears when configured on the gateway).
            </p>
            <TelephonyOutboundControls />
          </div>
        )}
      </div>
    </PIPWindow>
  );
}
