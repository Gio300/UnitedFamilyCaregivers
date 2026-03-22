import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

function isValidSupabaseUrl(url: string | undefined): boolean {
  const trimmed = url?.trim();
  return !!trimmed && /^https?:\/\//i.test(trimmed);
}

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseUrl = isValidSupabaseUrl(rawUrl) ? rawUrl!.trim() : FALLBACK_URL;
  const supabaseAnonKey = rawKey?.trim() || FALLBACK_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
