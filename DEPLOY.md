# UnitedFamilyCaregivers - Deployment Guide

## GitHub Pages (UI)

1. **Settings > Pages** – Set **Source** to **GitHub Actions** (not "Deploy from a branch")
2. **Secrets** – In Settings > Secrets and variables > Actions:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_API_BASE`
   - `SUPABASE_DATABASE_URL` (one-time) – Session pooler URL from Supabase Dashboard > Settings > Database, for the Push Supabase Migrations workflow. Encode `@` in password as `%40`.
3. **Deploy** – Push to `main` triggers the "Deploy to GitHub Pages" workflow
4. **Live URL** – https://gio300.github.io/UnitedFamilyCaregivers/

## Supabase Migration (Required)

Run in Supabase SQL Editor:

```sql
-- Add onboarding_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Call notes table
CREATE TABLE IF NOT EXISTS public.call_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  client_id uuid REFERENCES auth.users(id),
  call_reason text,
  disposition text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own call_notes" ON public.call_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);
```

Or run migrations via GitHub Actions (Push Supabase Migrations workflow) or locally: `supabase db push --db-url "$SUPABASE_DATABASE_URL" --yes`. Migrations use unique timestamps (e.g. `20240319120001_add_onboarding_notes_reminders.sql`).

## AI Gateway Startup

```bash
cd ai-gateway
# Ensure .env has PORT=7501
npm start
```

## Caddy (for Cloudflare Tunnel)

The tunnel expects Caddy on port **8080**. Use `Caddyfile.tunnel` (not Caddyfile.local):

```bash
cd UnitedFamilyCaregivers
.\scripts\run-caddy-tunnel.ps1
```

Or manually:
```bash
caddy run --config caddy/Caddyfile.tunnel
```

Caddy listens on 8080 and proxies `/api/*` to AI Gateway (7501).

## VPS Deployment (Docker)

For production, deploy the API on a VPS with Caddy + direct DNS (mirrors KloudyKare):

1. See [UFC_VPS_DEPLOY.md](UFC_VPS_DEPLOY.md) for full instructions
2. Run `docker compose up -d` from the `docker/` folder. After code changes, rebuild: `docker compose build --no-cache ai-gateway && docker compose up -d`
3. Set `NEXT_PUBLIC_API_BASE=https://api.unitedfamilycaregivers.com` in GitHub Secrets

## Cloudflare Tunnel

**Quick test** (no config, temporary URL):
```bash
cloudflared tunnel --url http://localhost:7501
```
Use the returned `xxx.trycloudflare.com` URL as `NEXT_PUBLIC_API_BASE`. No Caddy needed.

**Permanent** (api.kloudykare.com):
1. Copy `cloudflare/config.yml.example` to `~/.cloudflared/config.yml`
2. Replace `<TUNNEL_ID>` with your tunnel ID from `cloudflared tunnel create ufc-api`
3. Run: `cloudflared tunnel run ufc-api`
4. DNS: `api.kloudykare.com` CNAME to `<tunnel-id>.cfargotunnel.com`

For **api.kloudykare.com**: The root Kloudy Caddyfile routes `/api/*` to 7501. Ensure Caddy is running with that config and reload after changes. Set `NEXT_PUBLIC_API_BASE=https://api.kloudykare.com` in GitHub Secrets.

## LiveKit

- Project: `unitedfamilycaregivers-gwsxsuvp.livekit.cloud`
- Add `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` to `ai-gateway/.env`

## Startup Order

1. **Ollama** (background) — port 11434
2. **AI Gateway:** `cd ai-gateway && npm start` — port 7501
3. **Caddy** (for api.kloudykare.com): `caddy run --config caddy/Caddyfile.tunnel` — port 8080
4. **Cloudflare:** `cloudflared tunnel run ufc-api` or `cloudflared tunnel --url http://localhost:7501` (quick)

## Chat with Tools

Use `?tools=1` for tool-calling (non-streaming): `POST /api/chat?tools=1`

## Deployment Fixes (March 2025)

- **Migration duplicate-key fix:** All migrations renamed to unique timestamps (e.g. `20240319120001_...`). Removed redundant `001_add_onboarding_only_schema_full.sql`. The workflow runs a one-time repair to revert legacy `001` from remote history before pushing.
- **Login "placeholder.supabase.co":** Build now validates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before build. If missing, deploy fails with a clear error. Ensure both secrets are set in Settings > Secrets and variables > Actions.
- **Required GitHub Secrets:** `NEXT_PUBLIC_SUPABASE_URL` (https://YOUR_PROJECT.supabase.co), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_DATABASE_URL` (for migrations; use Session pooler from Supabase Dashboard).

## API Base Configuration

| Context | Value |
|---------|-------|
| Local dev | `http://localhost:7501` |
| UFC (Caddy from PC) | `https://api.unitedfamilycaregivers.com` (GitHub Secret) |
| Kloudy shared | `https://api.kloudykare.com` |
| Quick tunnel | `https://xxx.trycloudflare.com` (temporary) |

**Verify chain**: Run `scripts/diagnose-ufc-chain.ps1` to confirm Ollama, AI Gateway, Caddy, and DNS.

## Troubleshooting AI

| Symptom | Check |
|---------|-------|
| "API base URL not configured" | `NEXT_PUBLIC_API_BASE` empty. Set in GitHub Secrets (deployed) or `.env.local` (local). |
| "Failed to fetch" / CORS | API unreachable. Ensure AI Gateway (7501), tunnel, and `NEXT_PUBLIC_API_BASE` match. |
| 401 Unauthorized | Sign in required. Chat needs valid Supabase session. |
| Empty/slow response | Ollama not running or model not pulled. Run `ollama pull llama3.2:3b`. |
| api.kloudykare.com returns wrong service | Tunnel may point to wrong port. Config: `service: http://localhost:7501` (direct) or `http://localhost:8080` (via Caddy). |

**Verify locally:** `curl http://localhost:7501/api/health` → `{"status":"ok","service":"ufc-ai-gateway"}`

## Supabase Auth Redirect (Email Verification)

When users click the verify-email link from Supabase, they must land on the UFCi app.

1. **Supabase Dashboard** → Authentication → URL Configuration
2. **Site URL:** `https://gio300.github.io/UnitedFamilyCaregivers`
3. **Redirect URLs** – add:
   - `https://gio300.github.io/UnitedFamilyCaregivers/auth/callback`
   - `https://gio300.github.io/UnitedFamilyCaregivers/login`
   - For local dev: `http://localhost:3000/auth/callback`, `http://localhost:3000/login`

The auth callback page sets the session and redirects to `/login` after verification.

## Full Schema + Test Data

For Message Center (bell icon), profiles, AI Reply, and Notes to work:

1. **Supabase SQL Editor** – run migrations in order:
   - `20240319120006_fix_profiles_rls_recursion.sql` — profiles RLS for admins
   - `20240319120007_approve_manager_johnny.sql` — approve johnny.allen32 (Eligibility/Appointments)
   - `20240319120010_notification_views_user_scoped.sql` — fixes Message Center 500s (unread count)
   - `20240319120014_reminders_schema_align.sql` — reminders schema
   - `20240319120015_chat_sessions.sql` — chat_sessions table
   - `20240319120016_activity_session_link.sql` — session_id on activity_log, call_notes (for "This chat" notes scope)
   - `20240319120017_seed_message_center.sql` — Message Center seed
   - `20240319120018_seed_test_profiles_data.sql` — test_profiles seed (if using test profiles)
   - `20240319120019_reminders_text_remind_at.sql` — reminders text/remind_at for Message Center

   Or run `supabase/schema_full.sql` then migrations 006–019. Then seeds:
   - `supabase/seed_test_minimal.sql` (test profiles)
   - `supabase/seed_message_center.sql` (if not in migrations)

2. **notification_views** – migration `20240319120010_notification_views_user_scoped.sql` creates the user-scoped table (required for unread count).

3. **Message Center table errors** – If "Some tables returned errors" persists: (a) Run migrations 006, 010, 014, 016, 017 in order; (b) Use the UFC Supabase project (not KloudyKare); (c) Ensure reminders has `target_user_id` and `text` (migration 014 adds target_user_id; if using schema_full, reminders uses creator_id, target_user_id, text, remind_at).

## Context Indicators (Admin)

When admins (CSR/admin) select a profile from the Options > Profiles panel:

- **Chat banner** — "Viewing: [Client Name]" appears at the top of the chat with a Clear button.
- **Right panel** — Shows "Viewing: [Client Name]" or "No profile selected" in the Options view.
- **AI context** — The AI receives `activeClientName` and `mode` and may mention whose profile is being discussed.
- **Notes** — The Notes bar (AutoNotesBar) shows activities for the active client; "This chat" scope filters by the current chat session.
