# LiveKit Kloudy — HTTP tools and gateway wiring

Point **LiveKit Agent Builder → Actions** at your public **ai-gateway** base URL (same host you use for `NEXT_PUBLIC_API_BASE`), with **Bearer** user tokens where routes use `requireAuth`.

For **server-to-server** calls from LiveKit (no end-user JWT), add a shared secret and validate it on the gateway (recommended pattern below).

## Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_API_BASE` | Next.js | Browser calls gateway (`/api/chat`, `/api/mcp`, `/api/companion-orchestrate`, …). |
| `LIVEKIT_HTTP_TOOL_SECRET` | ai-gateway (optional) | If set, stub/tool routes below require header `X-LiveKit-Tool-Secret` to match. **Not yet enforced in code** — set when you harden onboarding stubs. |

## Copy-paste Instructions & Welcome

Use:

`livekit-voice-agent/prompts/livekit-agent-builder-instructions.md`

## HTTP tool table (stubs on gateway today)

| Name | Method | URL (relative to API base) | Auth | Body / notes |
|------|--------|-----------------------------|------|----------------|
| Onboarding status | GET | `/api/voice/onboarding-status` | `Authorization: Bearer <user JWT>` | Returns `{ ok, nextField, message }` stub. |
| Onboarding draft | POST | `/api/voice/onboarding-draft` | `Authorization: Bearer <user JWT>` | JSON object of fields; returns `{ ok, received, stub }`. |
| Companion orchestrate | POST | `/api/companion-orchestrate` | Bearer JWT | For debugging only from trusted clients; not typical for LiveKit. |

### Example: onboarding draft

```http
POST https://YOUR_GATEWAY_HOST/api/voice/onboarding-draft
Authorization: Bearer <SUPABASE_USER_JWT>
Content-Type: application/json

{"full_name":"Jane Doe","phone":"555-0100"}
```

### Future: service secret header

When implementing LiveKit → gateway without a user session:

```http
X-LiveKit-Tool-Secret: <same value as LIVEKIT_HTTP_TOOL_SECRET>
```

Map `room_name` / `participant_identity` to a user in your DB before writing drafts.

## Caddy / reverse proxy

Expose the same paths as the existing gateway (`/api/*`). No extra path prefix required if `NEXT_PUBLIC_API_BASE` already points at the gateway root.

## Related app routes

- `POST /api/companion-orchestrate` — LLM + optional MCP; powers Companion suggested actions (authenticated app users).
- `POST /api/companion-guidance` — Legacy plain-text guidance (still available).
