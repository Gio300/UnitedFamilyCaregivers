# UnitedFamilyCaregivers - Deployment Guide

## GitHub Pages (UI)

1. **Settings > Pages** – Set **Source** to **GitHub Actions** (not "Deploy from a branch")
2. **Secrets** – Ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_API_BASE` are set
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

Or run the migration file: `supabase/migrations/001_add_onboarding_notes_reminders.sql`

## AI Gateway Startup

```bash
cd ai-gateway
# Ensure .env has PORT=9905
npm start
```

## Caddy (Local)

```bash
cd caddy
caddy run --config Caddyfile.local
```

## Cloudflare Tunnel

```bash
cloudflared tunnel run ufc-api
```

DNS: `api.kloudykare.com` CNAME to `<tunnel-id>.cfargotunnel.com`

## Chat with Tools

Use `?tools=1` for tool-calling (non-streaming): `POST /api/chat?tools=1`
