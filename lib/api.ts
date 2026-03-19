/**
 * API base URL for AI Gateway (Cloudflare Tunnel or api.kloudykare.com).
 * Set via NEXT_PUBLIC_API_BASE in .env.local
 */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE || "";
  }
  return process.env.NEXT_PUBLIC_API_BASE || "";
}
