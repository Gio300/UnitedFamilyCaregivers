# UFC Cloudflare Tunnel (Docker)

Keeps `api.unitedfamilycaregivers.com` running in the background via Docker.

## Prerequisites

- **Docker Desktop** for Windows ([download](https://www.docker.com/products/docker-desktop/))
- **AI Gateway** running on port 7501
- **GoDaddy CNAME** for `api` → `7a42ee34-e348-40e4-bfe4-1c2bfa8f7823.cfargotunnel.com`

## Usage

```powershell
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;" + $env:Path
cd "c:\Users\Flying Phoenix PCs\Desktop\AiKloudy\Kloudy_Ai\UnitedFamilyCaregivers"
docker compose -f docker-compose.cloudflared.yml up -d
```

## Commands

| Command | Description |
|---------|-------------|
| `docker compose -f docker-compose.cloudflared.yml up -d` | Start tunnel (background) |
| `docker compose -f docker-compose.cloudflared.yml down` | Stop tunnel |
| `docker compose -f docker-compose.cloudflared.yml logs -f` | View logs |

## Files

- `docker-compose.cloudflared.yml` – Docker Compose config
- `C:\Users\Flying Phoenix PCs\.cloudflared\config.docker.yml` – Tunnel config (uses `host.docker.internal:7501` for Windows host)

## Without Docker

Run manually:

```powershell
cloudflared tunnel run ufc-api-config
```

Keep the terminal open.
