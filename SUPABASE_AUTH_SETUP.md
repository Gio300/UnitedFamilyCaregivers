# Supabase Auth Configuration for UFCi

## 1. Email branding (United Family Caregiver instead of Supabase)

**Note:** This is done in the Supabase Dashboard, not via SQL.

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Edit each template (Confirm signup, Magic Link, Reset Password, etc.)
3. Change the sender name and any "Supabase" references to **United Family Caregiver** (or UFCi)
4. For custom "from" address, use **Project Settings** → **Auth** → **SMTP Settings** (requires custom SMTP)

## 2. Verification redirect and thank-you page

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to your app URL, e.g.:
   - Production: `https://gio300.github.io/UnitedFamilyCaregivers`
   - Local: `http://localhost:3000`
3. Add to **Redirect URLs**:
   - `https://gio300.github.io/UnitedFamilyCaregivers/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

4. The app uses `/auth/callback` to:
   - **Signup verification:** Complete email verification → redirect to **login** (not dashboard)
   - **Password reset:** Set session from recovery link → redirect to `/reset-password` to set new password → redirect to login

Signup passes `emailRedirectTo` so verification links go to `/auth/callback`. After verification, users are sent to the login screen to sign in.
