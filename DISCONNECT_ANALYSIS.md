# UFCi Disconnect Analysis (March 2026)

## Summary of Issues and Fixes

### 1. Reminders Schema Mismatch (Message Center 500s)

**Problem:** MessageCenterPIP and useMessageCenterUnread fetch `reminders` with columns `text`, `remind_at`, `target_user_id`. Migration 001 creates reminders with `user_id`, `title`, `due_at`. Migration 014 adds `target_user_id`, `status` but not `text` or `remind_at`. The queries failed with "column does not exist".

**Fix:** Migration `20240319120019_reminders_text_remind_at.sql` adds `text`, `remind_at`, `client_id`, `creator_id` and aligns RLS for both schema_full and migration paths.

---

### 2. Profiles 500 / No Profile Data

**Problem:** Profiles table RLS recursion ( migration 006 fix) or policies preventing admins from seeing all profiles. Also, `is_manager()` in 006 may not exist if migrations run out of order.

**Fix:** Run migrations 006, 007 (approve johnny) in order. Ensure schema has `profiles_select_managers` policy for admins.

---

### 3. AI / MCP "Failed to fetch"

**Problem:** `NEXT_PUBLIC_API_BASE` must be set at build time. If empty or wrong, or if the ai-gateway is unreachable (DNS, tunnel down, Caddy not routing), both AI and MCP fail. MCP runs on the same gateway, so both depend on reachability.

**Fix:** Verify `NEXT_PUBLIC_API_BASE` in GitHub Secrets. Restart AI gateway after code changes. Run `scripts/diagnose-ufc-chain.ps1` to verify full chain.

---

### 4. Notification Views (Message Center unread count)

**Problem:** schema_full creates `notification_views` without `user_id`. Migration 010 replaces it with user-scoped table (`user_id`, `item_type`, `item_id`). If 010 hasn't run, queries fail.

**Fix:** Run migration 010 before Message Center features.

---

### 5. Supabase Migrations Not Pushing

**Problem:** Workflow runs on push but requires `SUPABASE_DATABASE_URL` secret. If missing or invalid, migrations fail. `continue-on-error: true` hides failures.

**Fix:** Add `SUPABASE_DATABASE_URL` (Session pooler URL) to GitHub Secrets. Check Actions tab for migration workflow errors.

---

## Migration Order (Run in Supabase SQL Editor if workflow fails)

1. 006 – profiles RLS fix
2. 007 – approve manager
3. 008 – openemr logic (encounters, appointments if needed)
4. 010 – notification_views user-scoped
5. 014 – reminders target_user_id, status
6. 015 – chat_sessions
7. 016 – activity_session_link
8. 017 – seed_message_center
9. 018 – seed_test_profiles_data
10. **019 – reminders text, remind_at, creator_id, RLS align**

Then: `seed_test_minimal.sql`, `seed_message_center.sql`
