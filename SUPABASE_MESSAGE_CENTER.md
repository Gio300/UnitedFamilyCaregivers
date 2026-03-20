# Supabase Changes for Message Center

## Migration to Run

Run this migration in Supabase SQL Editor to enable the Message Center (bell icon):

**Supabase snippet name:** Create a new snippet or use an existing one.

**File:** `supabase/migrations/009_notification_views_user_scoped.sql`

### What it does

- Replaces `notification_views` with a user-scoped version
- Adds `user_id` so each user tracks their own "seen" state
- Enables unread count badge and "mark as seen" in Message Center

### Tables used by Message Center

No new tables beyond `notification_views`. The Message Center reads from:

- `reminders` – pending reminders for the user
- `call_notes` – call notes by the user
- `incoming_emails` – emails (RLS-filtered by client access)
- `sent_messages` – sent emails (RLS-filtered)
- `activity_log` – activity by the user
- `notification_views` – per-user seen tracking (updated by 009)

### Run order

If starting fresh, run migrations in order: 001 → 002 → ... → 008 → **009**.

If `notification_views` already exists (from schema_full), 009 will drop and recreate it with the new structure.
