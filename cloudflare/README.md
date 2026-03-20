# Cloudflare Tunnel for UnitedFamilyCaregivers

Exposes the local AI Gateway (via Caddy) to the internet without port forwarding.

## Prerequisites

1. Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com)
2. cloudflared installed: [Installation guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

   For Windows: Download from [GitHub releases](https://github.com/cloudflare/cloudflared/releases) or use:
   ```powershell
   # If winget is available:
   winget install Cloudflare.cloudflared
   ```

## Quick test (no tunnel create)

Get a temporary URL for testing:

```powershell
# Option A: Direct to AI Gateway (simplest)
cloudflared tunnel --url http://localhost:7501

# Option B: Via Caddy (use when Caddy is on 8080)
cloudflared tunnel --url http://localhost:8080
```

Use the returned `xxx.trycloudflare.com` URL as `NEXT_PUBLIC_API_BASE`.

## Permanent tunnel

1. Login (opens browser):
   ```powershell
   cloudflared tunnel login
   ```

2. Create tunnel:
   ```powershell
   cloudflared tunnel create ufc-api
   ```

3. Route DNS (if using api.kloudykare.com):
   ```powershell
   cloudflared tunnel route dns ufc-api api.kloudykare.com
   ```

4. Copy `config.yml.example` to `~/.cloudflared/config.yml` and fill in `<TUNNEL_ID>` from step 2.

5. Run tunnel:
   ```powershell
   cloudflared tunnel run ufc-api
   ```

## Flow

```
Internet -> Cloudflare -> Tunnel -> Caddy (8080) -> AI Gateway (7501)
# Or direct: Tunnel -> AI Gateway (7501)
```
