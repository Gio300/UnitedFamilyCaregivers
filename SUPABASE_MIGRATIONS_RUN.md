# Run UFC Supabase Migrations

If you see **406 Not Acceptable** from Supabase, run these migrations in order.

## Steps

1. Go to **Supabase Dashboard** → your UFC project → **SQL Editor**
2. Run each migration file in order (copy-paste the contents):

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase/migrations/001_add_onboarding_notes_reminders.sql` | onboarding, notes, reminders |
| 2 | `supabase/migrations/002_preapprove_manager.sql` | manager preapproval |
| 3 | `supabase/migrations/003_profiles_rls_mention.sql` | profiles RLS |
| 4 | `supabase/migrations/004_registration_approval.sql` | registration requests |
| 5 | `supabase/migrations/005_fix_profiles_rls_recursion.sql` | RLS recursion fix |
| 6 | `supabase/migrations/006_approve_manager_johnny.sql` | (optional) test data |
| 7 | `supabase/migrations/007_openemr_logic.sql` | OpenEMR tables |
| 8 | `supabase/migrations/008_test_profiles_temporary.sql` | (optional) test profiles |
| 9 | `supabase/migrations/009_notification_views_user_scoped.sql` | notification_views |

3. Run them one at a time. If a migration fails (e.g. "relation already exists"), it may already be applied—skip or adjust as needed.

## Verify

After running, check **Table Editor** for: `profiles`, `notification_views`, `reminders`, `activity_log`, etc.
