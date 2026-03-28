import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer console — UFCi",
  robots: { index: false, follow: false },
};

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">{children}</div>;
}
