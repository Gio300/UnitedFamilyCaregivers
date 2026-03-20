# Supabase Setup for UFCi

Run these in **Supabase SQL Editor** in order.

## 1. Full schema (if starting fresh)

Run `supabase/schema_full.sql` – creates all tables. **Warning:** Drops existing tables.

## 2. Profile RLS (fix 406 / "No users found")

Run `supabase/migrations/003_profiles_rls_mention.sql`

## 3. Fix RLS recursion (fix 500 errors)

Run `supabase/migrations/005_fix_profiles_rls_recursion.sql`

## 4. Registration requests + supervisor policies

Run `supabase/migrations/004_registration_approval.sql`

## 5. Pre-approve manager (johnny.allen32 for Supervisor mode)

Run `supabase/migrations/002_preapprove_manager.sql`

**Note:** User must exist in Auth > Users first. Sign up at your app, then run this.

## 6. Minimal test profiles (1 client, 1 caregiver, 1 CSR pending)

Run `supabase/seed_test_minimal.sql`

Creates:
- **Alice Client** – test_client@ufci-test.local / test123
- **Maria Caregiver** – test_caregiver@ufci-test.local / test123
- **Dana CSR** – test_csr@ufci-test.local / test123 (pending csr_admin approval)

If you get "permission denied" on auth.users:
1. Create 3 users manually in **Auth > Users** (Add user) with those emails
2. Run only the INSERT into profiles, client_profiles, and registration_requests (skip the DO block)

## Quick reference

| Query name in Supabase | Script |
|------------------------|--------|
| Family Caregiver Profiles | schema_full.sql |
| Profile Access Policies for Mentions | 003_profiles_rls_mention.sql |
| Test User & Profile Seed for Manager Testing | 005_fix_profiles_rls_recursion.sql |
| Unknown SQL Snippet | 004_registration_approval.sql |
| Pre-approve manager | 002_preapprove_manager.sql |
| Minimal test seed | seed_test_minimal.sql |
