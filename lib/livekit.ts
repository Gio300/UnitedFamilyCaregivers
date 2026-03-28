/**
 * Fetch a LiveKit token from the AI Gateway.
 * Requires Supabase session - pass the access token in Authorization header.
 */
export async function fetchLiveKitToken(
  roomName: string,
  supabaseAccessToken: string,
  apiBase: string
): Promise<string> {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/livekit/token`, {
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

export async function fetchLiveKitCsrToken(
  roomName: string,
  supabaseAccessToken: string,
  apiBase: string
): Promise<string> {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/livekit/csr-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAccessToken}`,
    },
    body: JSON.stringify({ roomName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to get CSR LiveKit token");
  }
  const { token } = await res.json();
  return token;
}

export async function supportQueueEnqueue(
  roomName: string,
  supabaseAccessToken: string,
  apiBase: string
): Promise<void> {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/support-queue/enqueue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAccessToken}`,
    },
    body: JSON.stringify({ roomName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Enqueue failed");
  }
}

export async function supportQueueAbandon(
  roomName: string,
  supabaseAccessToken: string,
  apiBase: string
): Promise<void> {
  const base = apiBase.replace(/\/+$/, "");
  await fetch(`${base}/api/support-queue/abandon`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAccessToken}`,
    },
    body: JSON.stringify({ roomName }),
  });
}
