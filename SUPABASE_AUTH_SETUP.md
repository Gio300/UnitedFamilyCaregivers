# Supabase Auth Configuration for UFCi

## 1. Email branding (UFCi instead of Supabase)

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Edit each template (Confirm signup, Magic Link, etc.)
3. Change the sender name and any "Supabase" references to **UFCi**
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
   - Complete email verification
   - Show "Thank you for verifying your email"
   - Redirect to login or dashboard

Signup already passes `emailRedirectTo` so verification links will go to `/auth/callback`.
