# UnitedFamilyCaregivers Caddy

This Caddy config serves only the AI Gateway for this project. It is separate from the Kloudy_Ai Caddy.

## Routes

- `/api/*` → AI Gateway (localhost:9905)

## Files

- `Caddyfile` - Production (use with Cloudflare Tunnel)
- `Caddyfile.local` - Local development (port 8080)

## Update workflow

When you add/remove API routes or change ports:

1. Edit `Caddyfile` or `Caddyfile.local`
2. Commit and push
3. On the host: `caddy reload --config caddy/Caddyfile.local` (or Caddyfile for prod)

## Run locally

```bash
caddy run --config caddy/Caddyfile.local
```

Ensure the AI Gateway is running on port 9900 before starting Caddy.
