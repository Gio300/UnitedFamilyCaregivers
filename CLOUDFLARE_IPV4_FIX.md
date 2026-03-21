# Fix: api.unitedfamilycaregivers.com Timeout (IPv6-Only DNS)

**Quick fix:** Run `scripts\start-tunnel-and-get-url.ps1`, use the printed URL as `NEXT_PUBLIC_API_BASE` in GitHub Secrets, then push.

## Root cause

When the API hostname is resolved via **GoDaddy DNS** (CNAME → `*.cfargotunnel.com`), Cloudflare returns **IPv6-only** (AAAA record). Networks without working IPv6 connectivity cannot reach the tunnel and see timeouts.

## Verified facts

- Local API works: `http://localhost:7501/api/health` → 200 OK
- Public API times out: `https://api.unitedfamilycaregivers.com/api/health` → timeout
- DNS returns only IPv6: `fd10:aec2:5dae::` (no IPv4)
- `trycloudflare.com` quick tunnels work (they have both IPv4 and IPv4)

## Solution: Add domain to Cloudflare

To get IPv4 connectivity, the domain must be in Cloudflare so traffic is proxied through Cloudflare’s edge (which supports both IPv4 and IPv6).

### Option A: Full domain in Cloudflare (recommended)

1. Add `unitedfamilycaregivers.com` to Cloudflare (Add site).
2. Change nameservers at GoDaddy to the Cloudflare nameservers.
3. In Cloudflare DNS, add or update:
   - Existing records for the main site (root, www, etc.).
   - `api` → CNAME → `7a42ee34-e348-40e4-bfe4-1c2bfa8f7823.cfargotunnel.com` (proxy ON).
4. Ensure the tunnel hostname is configured in Cloudflare Zero Trust:
   ```bash
   cloudflared tunnel route dns ufc-api-config api.unitedfamilycaregivers.com
   ```
   (Requires domain in the same Cloudflare account.)

### Option B: Temporary workaround – quick tunnel

Use a quick tunnel URL that has IPv4:

```powershell
cd UnitedFamilyCaregivers
.\scripts\start-tunnel-and-get-url.ps1
```

Use the printed URL (e.g. `https://xxx.trycloudflare.com`) as `NEXT_PUBLIC_API_BASE` in GitHub Secrets. The URL changes each time you start the tunnel.

## Admin restart script

If cloudflared is stuck or misconfigured, run as Administrator:

```powershell
cd UnitedFamilyCaregivers\scripts
.\restart-tunnel-admin.ps1
```

This stops all cloudflared processes and starts a fresh tunnel with the correct config.
