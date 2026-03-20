# KloudyKare to UnitedFamilyCaregivers – Conversion Gap

## What UFC Has (Implemented)

- Auth: Supabase email/password, profiles with role
- Dashboard: Home, Chat, Profile, Documents, Calls
- Onboarding: Driver.js tour
- AI: Two-tier (llama3.2:3b chat, llama3.3 notes), MCP tools
- LiveKit: Voice room + notes extraction
- Schema: profiles, client_profiles, call_notes, reminders

## What KloudyKare Has (Not Yet in UFC)

| Feature | KloudyKare | UFC Status |
|--------|------------|------------|
| User type on login | Admin vs user flow | Single login; role from profile |
| Admin approval | admin_approved flag | approved_at in schema; not enforced in UI |
| Chat-centric UI | Chat as main view | Chat is one tab among others |
| OpenEMR integration | Sync to OpenEMR | Not in UFC |
| Direct messages | Admin↔user DMs | Not in UFC |
| Email drafts | AI-assisted email | Not in UFC |
| SQLite backend | Custom auth/session | Supabase (different stack) |
| Custom backend API | /admin/api/* | AI Gateway only |

## Supabase Updates Needed

1. Run migration: `supabase/migrations/001_add_onboarding_notes_reminders.sql`
2. RLS: Ensure role-based access for csr_admin, management_admin
3. approved_at: Use for caregiver approval workflow

## Data Security

- RLS is enabled on all tables
- Policies: users see/update own data
- Add role-based policies for admins (see clients, manage profiles)

## Recommended Next Steps

1. Make chat the default/primary view for clients
2. Add admin approval flow for caregivers
3. Add role-based redirect after login (e.g. admins → admin dashboard)
4. Consider DM/notification features if needed
