# UFC AI Chat – Setup Guide

## Current Setup: Direct Path (A Record + Caddy)

Traffic flow: **Internet → your IP:443 → Router (port forward) → Caddy → AI Gateway (7501)**.

### Requirements

- **DNS** (GoDaddy): `api` → A record → your public IP (e.g. 70.166.115.91)
- **Port forwarding** (router): 80 and 443 → 192.168.0.67 (your PC)
- **Caddy** (Docker): Handles HTTPS, proxies `/api/*` to 7501
- **UFC Docker** (AI Gateway + Ollama): `cd UnitedFamilyCaregivers/docker && docker compose up -d`

### Verify

```powershell
# Local (must work)
Invoke-WebRequest -Uri "http://localhost:7501/api/health" -UseBasicParsing

# Public (test from phone/cellular or external network – same-network tests may timeout due to NAT hairpinning)
Invoke-WebRequest -Uri "https://api.unitedfamilycaregivers.com/api/health" -UseBasicParsing
```

### NAT hairpin (same LAN as Caddy)

If `https://api.unitedfamilycaregivers.com` fails from a PC **on your home network** but works on **cellular**, your router likely lacks **NAT loopback / hairpin NAT**. Fix on each Windows PC that browses the dashboard:

```powershell
# PowerShell as Administrator — default: point hostname to Caddy LAN IP (matches typical port-forward target)
cd UnitedFamilyCaregivers\scripts
.\add-ufc-hosts-entry.ps1

# Same machine as Caddy only, if you prefer loopback:
# .\add-ufc-hosts-entry.ps1 -UseLoopback

# Different LAN IP for the Caddy box:
# .\add-ufc-hosts-entry.ps1 -LocalApiHostIp 192.168.0.100
```

Re-run the script after changing the Caddy PC’s IP. To remove the override later, delete the `api.unitedfamilycaregivers.com` line from `C:\Windows\System32\drivers\etc\hosts`.

### Restart services

```powershell
# Caddy (from project root)
cd caddy; docker compose restart

# UFC AI stack
cd UnitedFamilyCaregivers/docker; docker compose restart
```

---

## Alternative: Cloudflare Tunnel

Use if direct path fails (ISP blocks ports, etc.). See `CLOUDFLARE_IPV4_FIX.md` or run `scripts\start-tunnel-and-get-url.ps1` for a quick tunnel.

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Local health OK, public timeout (same network) | Normal – try from phone (cellular) or external network |
| Public timeout from anywhere | Port forwarding (80/443 → your PC), Windows Firewall, Caddy running |
| 502 Bad Gateway | AI Gateway (7501) not running; `docker compose up -d` in UFC docker folder |
