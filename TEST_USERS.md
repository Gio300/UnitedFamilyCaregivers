# UFCi Test Profiles

## Option A: Fake Profiles (no logins) – for manager testing

Creates caregivers, clients, and CSR as **data only**. You sign in as your manager account and see them in the system. No passwords or logins needed.

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run `supabase/seed_test_profiles.sql`

**Creates:**
- **2 caregivers:** Maria Caregiver, James Caregiver
- **3 clients:** Alice Client, Bob Client, Carol Client (linked to caregivers)
- **1 CSR:** Dana CSR

**When done:** Run `supabase/cleanup_test_profiles.sql` to remove all test data.

---

## Option B: Real test accounts (with logins)

For testing as different roles (caregiver, client, CSR, manager):

1. Create users in **Supabase Dashboard** → **Authentication** → **Users** (Add user)
2. Run `supabase/seed_test_users.sql` in SQL Editor

| Email | Purpose |
|-------|---------|
| `test.caregiver@example.com` | Caregiver with assigned client |
| `test.client@example.com` | Client linked to test caregiver |
| `test.csr@example.com` | CSR admin |
| `test.manager@example.com` | Management admin (all modes) |

---

## Notes

- **Option A** uses `supabase/seed_test_profiles.sql` – creates auth.users + profiles + client_profiles in one run.
- **Option B** uses `supabase/seed_test_users.sql` – updates profiles for users you create manually.
- If Option A fails with "permission denied" on auth.users, use Option B instead.
