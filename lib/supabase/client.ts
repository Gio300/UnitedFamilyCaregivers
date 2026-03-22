import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || FALLBACK_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
