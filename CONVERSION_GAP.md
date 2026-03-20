# KloudyKare to UnitedFamilyCaregivers – Conversion Gap

## What UFC Has (Implemented)

- Auth: Supabase email/password, profiles with role
- Dashboard: Home, Chat, Profile, Documents, Calls
- Onboarding: Driver.js tour
- AI: Two-tier (llama3.2:3b chat, llama3.3 notes), MCP tools
- LiveKit: Voice room + notes extraction
- **Full schema** (no OpenEMR): profiles, client_profiles, documents, call_notes, chat_messages, leads, user_documents, sent_messages, incoming_emails, reminders, notification_views, message_auto_responses, auto_mode_settings

## Applying the Full Schema

1. **Supabase Dashboard** → SQL Editor
2. **Replace existing**: Run `supabase/schema_reset.sql` first (drops all tables)
3. **Apply schema**: Run `supabase/schema_full.sql`
4. Verify tables in Table Editor

## Verifying the System

After applying the schema, run the app and check:

1. **Auth** – Sign up, sign in, profile created with role
2. **Dashboard** – `/dashboard`, `/dashboard/chat`, `/dashboard/profile`, `/dashboard/documents`, `/dashboard/calls`
3. **Chat** – Messages save to `chat_messages` (check Supabase Table Editor)
4. **Documents** – Upload flow uses `documents` table
5. **Call notes** – LiveKit notes save to `call_notes`
6. **Reminders** – Create/complete uses `reminders` table

## What KloudyKare Has (Not Yet in UFC)

| Feature | KloudyKare | UFC Status |
|--------|------------|------------|
| User type on login | Admin vs user flow | Single login; role from profile |
| Admin approval | admin_approved flag | approved_at in schema; not enforced in UI |
| Chat-centric UI | Chat as main view | Chat is one tab among others |
| OpenEMR integration | Sync to OpenEMR | **Excluded** (not in UFC) |
| Direct messages | Admin↔user DMs | Not in UFC |
| Email drafts | AI-assisted email | Not in UFC |
| Leads UI | Lead management | Schema ready; no UI |
| Sent/incoming emails | Email tracking | Schema ready; no UI |
| SQLite backend | Custom auth/session | Supabase (different stack) |
| Custom backend API | /admin/api/* | AI Gateway only |

## Data Security

- RLS enabled on all tables
- Policies: users see/update own data; admins see all clients
- Role-based: csr_admin, management_admin for leads, auto_mode, etc.

## Recommended Next Steps

1. Make chat the default/primary view for clients
2. Add admin approval flow for caregivers
3. Add role-based redirect after login (e.g. admins → admin dashboard)
4. Build leads UI (schema ready)
5. Build email tracking UI (schema ready)
