# Deployment Automation Analysis

**Generated:** Scan of your PC and deployment plan to minimize human-in-the-loop.

---

## What's Installed (Your PC)

| Tool | Status | Location |
|------|--------|----------|
| **Node.js** | OK (in PATH when added) | `C:\Program Files\nodejs\` |
| **Git** | OK (in PATH when added) | `C:\Program Files\Git\bin\` |
| **Ollama** | Installed, not in PATH | `C:\Users\Flying Phoenix PCs\AppData\Local\Programs\Ollama\ollama.exe` |
| **cloudflared** | Installed, not in PATH | `C:\Program Files (x86)\cloudflared\cloudflared.exe` or `C:\Tools\Cloudflared\cloudflared.exe` |
| **Supabase CLI** | Installed via npx | `npx supabase` works |
| **Caddy** | Not installed | Kloudy_Ai uses Docker for Caddy |
| **Docker** | Not in PATH | Not found |
| **winget** | Not in PATH | Not found |

---

## What I Can Do via Admin Terminal (No Human)

| Task | Command | Status |
|------|---------|--------|
| **Git push** | `git push origin main` | Done – code is on GitHub |
| **npm install** | `npm install` | Can run anytime |
| **npm build** | `npm run build` | Can run anytime |
| **AI Gateway start** | `cd ai-gateway && node server.js` | Can run (needs Ollama + .env) |
| **Add PATH for session** | `$env:Path += ";C:\...\Ollama;C:\...\cloudflared"` | Can run |
| **Cloudflare quick tunnel** | `cloudflared tunnel --url http://localhost:8080` | Can run (after PATH) |
| **Supabase schema** | `npx supabase db push` | Can run **after** Supabase login |

---

## What I Can Do via GitHub (if token available)

| Task | How | Human |
|------|-----|-------|
| **Push code** | `git push` | Done – no token needed (credentials cached) |
| **Add repo secrets** | GitHub API | Needs token |
| **Enable Pages** | GitHub API | Needs token |
| **Trigger workflow** | Push to main | Already triggers on push |

---

## What I Can Do via Supabase (if logged in)

| Task | Command | Human |
|------|---------|-------|
| **Login** | `npx supabase login` | Opens browser once |
| **List projects** | `npx supabase projects list` | After login |
| **Link project** | `npx supabase link --project-ref xxx` | After login |
| **Push schema** | `npx supabase db push` | After link |
| **Create project** | Dashboard only | Must create in dashboard |

---

## What Requires Human (One-Time or Per-Session)

| Task | Why |
|------|-----|
| **Supabase login** | `supabase login` opens browser |
| **Supabase create project** | Dashboard only |
| **Supabase run schema** | Can automate after login; or copy-paste SQL in dashboard |
| **LiveKit create project** | Dashboard only |
| **Cloudflare tunnel login** | `cloudflared tunnel login` opens browser |
| **GitHub Pages enable** | Settings > Pages > Source: GitHub Actions |
| **GitHub repo secrets** | Settings > Secrets > Actions |
| **Caddy install** | Installer or winget (winget not in PATH) |
| **Ollama add to PATH** | System env vars (or use full path) |

---

## Recommended Automation Sequence

### Phase 1: One-Time Human Actions (5–10 min)

1. **Supabase:** Create project, run `supabase/schema.sql` in SQL Editor, enable Auth.
2. **Supabase CLI:** Run `npx supabase login` (browser).
3. **LiveKit:** Create project, copy API key/secret.
4. **Cloudflare:** Run `cloudflared tunnel login` (browser).
5. **GitHub Pages:** Settings > Pages > Source: **GitHub Actions**.
6. **GitHub Secrets:** Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_API_BASE`.

### Phase 2: Terminal Automation (I Can Run)

1. Add PATH to Ollama, cloudflared, Node, Git.
2. Create `.env` in ai-gateway (you provide values).
3. Create `.env.local` in project root (you provide values).
4. Start Ollama (if not running).
5. Start AI Gateway.
6. Start cloudflared quick tunnel (`cloudflared tunnel --url http://localhost:8080`).
7. Copy tunnel URL into `NEXT_PUBLIC_API_BASE` and re-push.

### Phase 3: Caddy (Optional)

- **Option A:** Install Caddy (e.g. chocolatey `choco install caddy` if installed).
- **Option B:** Use cloudflared tunnel directly to AI Gateway (e.g. `--url http://localhost:9900`) and skip Caddy for local dev.
- **Option C:** Use Docker for Caddy (if Docker is available).

---

## PATH Script for Quick Setup

Run this at the start of each terminal session:

```powershell
$env:Path = "C:\Program Files\Git\bin;C:\Program Files\nodejs;C:\Users\Flying Phoenix PCs\AppData\Local\Programs\Ollama;C:\Program Files (x86)\cloudflared;" + $env:Path
```

---

## Summary

| Category | Count |
|----------|-------|
| **Fully automated (no human)** | 6 tasks |
| **Automated after one-time human** | 4 tasks |
| **Human required** | 6 tasks |

**Best path:** Do the 6 human steps once, then I can run the rest via terminal.
