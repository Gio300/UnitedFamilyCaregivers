"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm space-y-6 p-6 rounded-xl bg-white shadow-lg border border-slate-200 text-center">
          <h1 className="text-2xl font-bold text-emerald-700">Check your email</h1>
          <p className="text-sm text-slate-600">
            We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
          </p>
          <Link href="/login" className="inline-block text-sm text-emerald-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6 p-6 rounded-xl bg-white shadow-lg border border-slate-200">
        <h1 className="text-2xl font-bold text-center text-emerald-700">Reset password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1 text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 text-white py-2.5 font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">
          <Link href="/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
