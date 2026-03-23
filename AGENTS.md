# UFC Agent Automation

When deploying or fixing CI/CD, do it programmatically—minimize human-in-the-loop.

## Deploy (GitHub Pages + Supabase)

1. **Sync secrets** – If `.env.local` exists, run `scripts/sync-secrets-to-github.ps1` (uses `gh` CLI to push Supabase/LiveKit/API vars to GitHub Secrets).
2. **Push** – Commit and push. Deploy workflow builds with secrets; Migrations workflow runs.
3. **Verify** – Check `GET /repos/Gio300/UnitedFamilyCaregivers/actions/runs?branch=main` for `conclusion: success`.
4. **Fix and repeat** – If failed, identify failing step from jobs API, fix, sync if needed, push again.

## Sync script

- Reads `.env.local` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.
- Runs `gh secret set` for each (requires `gh auth login` and Git in PATH).
- Use `gh workflow run deploy.yml` after adding `workflow_dispatch` to deploy.yml.

## Future integrations

- LiveKit, Caddy, Docker, Supabase migrations – update configs and workflows in sync; run deploy cycle until all pass.
