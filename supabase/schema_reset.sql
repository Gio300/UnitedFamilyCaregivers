-- UnitedFamilyCaregivers - Schema Reset (run BEFORE schema_full.sql to replace schema)
-- WARNING: This drops all tables and data. Use only when replacing the schema.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.auto_mode_settings CASCADE;
DROP TABLE IF EXISTS public.message_auto_responses CASCADE;
DROP TABLE IF EXISTS public.notification_views CASCADE;
DROP TABLE IF EXISTS public.reminders CASCADE;
DROP TABLE IF EXISTS public.incoming_emails CASCADE;
DROP TABLE IF EXISTS public.sent_messages CASCADE;
DROP TABLE IF EXISTS public.user_documents CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.call_notes CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.client_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
