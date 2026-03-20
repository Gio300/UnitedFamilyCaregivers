# UnitedFamilyCaregivers Caddy

This Caddy config serves only the AI Gateway for this project. It is separate from the Kloudy_Ai Caddy.

## Routes

- `/api/*` → AI Gateway (localhost:7501)

## Files

- `Caddyfile.tunnel` - For Cloudflare Tunnel (listens on 8080). Tunnel config: `service: http://localhost:8080`
- `Caddyfile.local` - Local dev (port 7502). Access: http://localhost:7502
- `Caddyfile` - Production (api.kloudykare.com)

## Run for tunnel

```bash
caddy run --config caddy/Caddyfile.tunnel
```

Or: `.\scripts\run-caddy-tunnel.ps1`

Ensure the AI Gateway is running on port 7501, and Cloudflare tunnel points to localhost:8080.

**Note:** You can skip Caddy and point the tunnel directly to 7501: `cloudflared tunnel --url http://localhost:7501`
