/**
 * Fetch a LiveKit token from the AI Gateway.
 * Requires Supabase session - pass the access token in Authorization header.
 */
export async function fetchLiveKitToken(
  roomName: string,
  supabaseAccessToken: string,
  apiBase: string
): Promise<string> {
  const res = await fetch(`${apiBase}/api/livekit/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAccessToken}`,
    },
    body: JSON.stringify({ roomName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to get LiveKit token");
  }
  const { token } = await res.json();
  return token;
}
