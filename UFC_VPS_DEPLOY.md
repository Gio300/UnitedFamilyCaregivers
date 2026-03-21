# UFC Deployment (Docker)

Deploy the United Family Caregivers API. Supports: local PC with port forwarding, or VPS.

## Local PC with Port Forwarding (Current Setup)

If you run on your PC with ports 80/443 forwarded to your public IP:

1. **Kloudy Caddy** (`caddy-caddy-1`) handles api.unitedfamilycaregivers.com and routes `/api/*` to host:7501
2. **UFC Docker** (`UnitedFamilyCaregivers/docker`): AI Gateway (7501) + Ollama
3. **AnythingLLM**: Left untouched. UFC uses its own `docker-ollama-1` container.

Start UFC stack: `cd UnitedFamilyCaregivers/docker && docker compose up -d`

---

## Architecture

```
GitHub Pages (gio300.github.io/UnitedFamilyCaregivers)
        |
        |  NEXT_PUBLIC_API_BASE = https://api.unitedfamilycaregivers.com
        v
DNS: api.unitedfamilycaregivers.com  A record  ->  VPS IP
        |
        v
VPS: Caddy (:80/:443) -> AI Gateway (:7501) -> Ollama (:11434)
```

## Requirements

- VPS: Ubuntu 22.04+, 2+ GB RAM (Ollama models need memory)
- Ports 80 and 443 open (firewall)
- Docker and Docker Compose installed

## What You Need To Do

### 1. Provision VPS

Rent a VPS (DigitalOcean, Linode, Vultr, etc.). Ubuntu 22.04 or 24.04.

### 2. DNS

At GoDaddy (or your DNS provider for unitedfamilycaregivers.com):

- **Type:** A
- **Name:** api
- **Value:** Your VPS public IP
- **TTL:** 600 (or default)

Remove or update any existing CNAME for `api` that pointed to cfargotunnel.com.

### 3. Install Docker on VPS

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in
```

### 4. Deploy

```bash
git clone https://github.com/gio300/UnitedFamilyCaregivers.git
cd UnitedFamilyCaregivers/docker

cp .env.example .env
# Edit .env - fill in SUPABASE_URL, SUPABASE_ANON_KEY, LIVEKIT_API_KEY, LIVEKIT_API_SECRET

docker compose up -d
```

### 5. Pull Ollama Models

```bash
docker compose exec ollama ollama pull llama3.2:3b
docker compose exec ollama ollama pull llama3.3
```

### 6. GitHub Secrets

Repo -> Settings -> Secrets and variables -> Actions:

- Set `NEXT_PUBLIC_API_BASE` = `https://api.unitedfamilycaregivers.com`

### 7. Trigger Rebuild

Push a commit to `main` or re-run the "Deploy to GitHub Pages" workflow. The build embeds `NEXT_PUBLIC_API_BASE` at compile time.

## Verification

```bash
# Health check
curl https://api.unitedfamilycaregivers.com/api/health
# Expected: {"status":"ok","service":"ufc-ai-gateway"}
```

## Troubleshooting

| Issue | Check |
|-------|-------|
| 502 Bad Gateway | AI Gateway or Ollama not running. `docker compose ps` |
| Caddy cert fail | DNS not propagated. Wait 5–15 min, verify `dig api.unitedfamilycaregivers.com` |
| Chat "Failed to fetch" | NEXT_PUBLIC_API_BASE wrong or GitHub Pages not rebuilt |
| 401 Unauthorized | Supabase auth. Ensure SUPABASE_URL and SUPABASE_ANON_KEY match UFC project |
