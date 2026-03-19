# UnitedFamilyCaregivers

User-facing app for United Family Caregivers (NV Care Solutions Inc.). Deployed via GitHub Pages.

## Architecture

- **Frontend:** Next.js (static export) on GitHub Pages
- **Auth/DB:** Supabase
- **VoIP:** LiveKit
- **AI:** Local AI Gateway (Ollama) via Cloudflare Tunnel

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` - From Supabase project Settings > API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase project Settings > API
- `NEXT_PUBLIC_LIVEKIT_URL` - From LiveKit Cloud (wss://xxx.livekit.cloud)
- `NEXT_PUBLIC_API_BASE` - Cloudflare Tunnel URL or api.kloudykare.com

### 3. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in SQL Editor
3. Enable Auth providers (Email, Google, etc.)

### 4. Local development

**AI Gateway** (requires Ollama running):

```bash
cd ai-gateway
cp .env.example .env
# Edit .env with Supabase and LiveKit credentials
npm install && npm start
```

**Caddy** (proxies to AI Gateway):

```bash
caddy run --config caddy/Caddyfile.local
```

**Next.js:**

```bash
npm run dev
```

### 5. GitHub Pages deployment

1. Add repository secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_API_BASE`
2. Enable GitHub Pages: Settings > Pages > Source: GitHub Actions
3. Push to `main` to deploy

## URLs

- **GitHub Pages:** `https://gio300.github.io/UnitedFamilyCaregivers/`
- **API:** Set via `NEXT_PUBLIC_API_BASE` (Cloudflare Tunnel or custom domain)
