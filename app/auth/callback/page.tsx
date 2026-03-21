"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        if (session) {
          setStatus("success");
          setMessage("Thank you for verifying your email. You can now sign in.");
          setTimeout(() => router.replace("/login"), 3000);
        } else {
          const hash = typeof window !== "undefined" ? window.location.hash : "";
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");
          if (accessToken && refreshToken && type === "recovery") {
            const { error: setError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (setError) {
              setStatus("error");
              setMessage(setError.message);
              return;
            }
            router.replace("/reset-password");
            return;
          } else if (accessToken && refreshToken && (type === "signup" || type === "magiclink" || type === "email")) {
            const { error: setError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (setError) {
              setStatus("error");
              setMessage(setError.message);
              return;
            }
            setStatus("success");
            setMessage("Thank you for verifying your email. Redirecting to sign in...");
            setTimeout(() => router.replace("/login"), 2000);
          } else {
            setStatus("error");
            setMessage("Could not complete verification. You may already be verified. Try signing in.");
          }
        }
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md p-8 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
        <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">UFCi</h1>
        {status === "loading" && (
          <p className="text-slate-600 dark:text-slate-300">Completing verification...</p>
        )}
        {status === "success" && (
          <>
            <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-2">Verification successful</p>
            <p className="text-slate-600 dark:text-slate-300 text-sm">{message}</p>
            <Link href="/login" className="mt-4 inline-block text-sm text-emerald-600 dark:text-emerald-400 underline">
              Go to sign in
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Verification issue</p>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">{message}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              If you already verified, you can sign in below.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
