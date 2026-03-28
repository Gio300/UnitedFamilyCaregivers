"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

/** Same shell as main dashboard (chat + Companion); opens Companion for voice and scheduling. */
export default function CustomerSupportRoutePage() {
  const { openCompanion } = useApp();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/dashboard/customer-support") return;
    openCompanion();
  }, [pathname, openCompanion]);

  return null;
}
