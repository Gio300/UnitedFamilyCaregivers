"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px] text-slate-500">
      Redirecting...
    </div>
  );
}
