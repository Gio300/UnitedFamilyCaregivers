# UFCi Test Users

Use these test accounts to verify profiles, notes, messages, and role-based features.

## Step 1: Create Users in Supabase

1. Open **Supabase Dashboard** → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Create these four users (use password `TestPass123!` or any secure password):

| Email | Purpose |
|-------|---------|
| `test.caregiver@example.com` | Caregiver with assigned client |
| `test.client@example.com` | Client linked to test caregiver |
| `test.csr@example.com` | CSR admin (Customer Service, Appointments) |
| `test.manager@example.com` | Management admin (all modes including Supervisor) |

## Step 2: Run the Seed SQL

1. Open **Supabase Dashboard** → **SQL Editor**
2. Paste and run the contents of `supabase/seed_test_users.sql`

This will:

- Set `full_name` and `role` on each profile
- Set `approved_at` so users can access the app
- Create a `client_profiles` row linking Test Client to Test Caregiver

## Step 3: Test

- **test.caregiver@example.com**: Log in, view Test Client profile, leave notes
- **test.client@example.com**: Log in, view own profile, see caregiver
- **test.csr@example.com**: Log in, see Customer Service and Appointments modes, manage clients
- **test.manager@example.com**: Log in, see all modes including Supervisor

## Notes

- The `handle_new_user` trigger creates a profile row on signup; the seed updates it.
- If a user already exists, the seed updates their profile. The `client_profiles` insert skips if the link already exists.
