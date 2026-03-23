# Deploy-Fix-Repeat Cycle

When deploying or fixing CI/CD, follow this cycle until all workflows succeed. Minimize human-in-the-loop.

## Cycle

1. **Deploy** – Commit and push changes. Triggers GitHub Actions.
2. **Check status** – Use GitHub API or Actions page to determine pass/fail:
   - `GET /repos/{owner}/{repo}/actions/runs?per_page=5&branch=main`
   - Inspect `conclusion` (success | failure | skipped) per workflow and job.
3. **If failed** – Fetch job details and identify the failing step:
   - `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`
   - Find step with `conclusion: "failure"`.
4. **Fix** – Address the root cause from the bug report (step name, error message, exit code).
5. **Redeploy** – Commit fix, push, return to step 2.
6. **Success** – When both Deploy and Migrations workflows pass, stop.

## Common Fixes

| Failure | Likely cause | Fix |
|---------|--------------|-----|
| Validate deploy secrets | `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set | Use warning instead of error (deploy succeeds; login fails until secrets added) |
| Push migrations exit 1 | SQL error, schema mismatch, duplicate version | Check migration files; fix SQL; ensure unique timestamps; run `migration repair` if needed |
| Build failure | TypeScript, lint, or dep errors | Fix code, types, or deps |

## Success Criteria

- **Deploy to GitHub Pages** – Must pass (site is live). Validation step warns but does not block.
- **Push Supabase Migrations** – Should pass. Migrations are idempotent and handle missing profiles table.

## Rules

- Do not remove instrumentation or validation until the fix is verified.
- Prefer warnings over hard failures when the deploy can still produce a usable artifact.
- If logs are inaccessible (403), infer from step names and add `--debug` for future runs.
- Document one-time fixes (e.g. `migration repair`) in workflow comments.

## GitHub API (unauthenticated)

- Workflow runs: `https://api.github.com/repos/OWNER/REPO/actions/runs?per_page=5&branch=main`
- Job details: `https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID/jobs`
- Logs require auth and may return 403.
