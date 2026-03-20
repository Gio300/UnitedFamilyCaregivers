"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      supabase
        .from("profiles")
        .select("role, approved_at")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          const role = data?.role;
          const approved = !!data?.approved_at;
          const needsApproval = (role === "csr_admin" || role === "management_admin") && !approved;
          const onPendingPage = pathname === "/dashboard/pending-approval";
          if (needsApproval && !onPendingPage) {
            router.replace("/dashboard/pending-approval");
            return;
          }
          setReady(true);
        })
        .catch(() => setReady(true));
    });
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
