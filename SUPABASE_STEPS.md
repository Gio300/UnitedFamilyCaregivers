# Supabase Steps for UnitedFamilyCaregivers

Run these in **Supabase Dashboard → SQL Editor** in order. Use the same Supabase project as your app (`NEXT_PUBLIC_SUPABASE_URL`).

---

## 1. Full schema (if starting fresh)

If your database is empty or you want a clean slate, run `schema_full.sql` first. **Warning:** This DROPS existing tables.

Otherwise skip to step 2.

---

## 2. Migrations (run in order)

Execute each file in the SQL Editor:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `migrations/001_add_onboarding_notes_reminders.sql` | call_notes, reminders, onboarding_completed |
| 2 | `migrations/001_add_profile_settings.sql` | theme, accent_color, activity_log |
| 3 | `migrations/002_preapprove_manager.sql` | Pre-approve manager role |
| 4 | `migrations/003_profiles_rls_mention.sql` | Allow managers/caregivers/clients to see profiles |
| 5 | `migrations/004_registration_approval.sql` | registration_requests table |
| 6 | `migrations/005_fix_profiles_rls_recursion.sql` | Fix RLS 500 errors |
| 7 | `migrations/006_approve_manager_johnny.sql` | Approve johnny.allen32@yahoo.com as manager |
| 8 | `migrations/007_openemr_logic.sql` | encounters, clinical_notes, appointments, medications, allergies, vitals |
| 9 | `migrations/008_test_profiles_temporary.sql` | test_profiles, test_client_profiles (no auth.users) |

---

## 3. Seed test data (optional)

**Option A – Test profiles only (no auth.users):**

Run `seed_test_profiles_only.sql` after migration 008.  
Creates 7 test profiles (caregivers, clients, CSR, manager) for the Profiles panel. No signup required.

**Option B – Full test with auth users:**

1. Create users in **Supabase → Authentication → Users** (or use signup):
   - test_client@ufci-test.local
   - test_caregiver@ufci-test.local
   - test_manager@ufci-test.local
   - etc.

2. Run `seed_test_minimal.sql` then `seed_test_extended.sql` (uses auth.users IDs).

---

## 4. Verify

- **Profiles:** Dashboard → Profiles tab should show users or test profiles.
- **RLS:** No 500 errors when loading dashboard, profile page, or chat.

---

## 5. Cleanup (when done testing)

Run `cleanup_test_profiles_temporary.sql` to remove test_profiles and test_client_profiles.
