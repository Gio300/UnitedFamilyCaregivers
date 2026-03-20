-- UnitedFamilyCaregivers - Full Schema (KloudyKare clone, no OpenEMR)
-- Run this in Supabase SQL Editor. It DROPS existing tables then recreates.
-- Tables: profiles, client_profiles, documents, call_notes, chat_messages,
--        leads, user_documents, sent_messages, incoming_emails, reminders,
--        notification_views, message_auto_responses, auto_mode_settings

-- =============================================================================
-- RESET: Drop existing tables (ensures no "column does not exist" errors)
-- =============================================================================
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
DROP TABLE IF EXISTS public.document_notes CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.client_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =============================================================================
-- PROFILES (extends auth.users)
-- =============================================================================
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  full_name text,
  role text DEFAULT 'client' CHECK (role IN ('client','caregiver','csr_admin','management_admin')),
  caregiver_id uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  onboarding_completed boolean DEFAULT false,
  device_type text DEFAULT 'desktop',
  text_size text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- CLIENT_PROFILES (customers/clients - caregivers' clients)
-- =============================================================================
CREATE TABLE public.client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  caregiver_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  dob date,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  provider_type text,
  specialty_codes text,
  service_types text,
  notes text,
  profile_type text DEFAULT 'client',
  is_active boolean DEFAULT true,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- DOCUMENTS (per client)
-- =============================================================================
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  section text,
  notes text,
  uploaded_at timestamptz DEFAULT now()
);

-- =============================================================================
-- DOCUMENT_NOTES (per-user notes on documents)
-- =============================================================================
CREATE TABLE public.document_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- CALL_NOTES (per client or standalone)
-- =============================================================================
CREATE TABLE public.call_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  client_id uuid REFERENCES public.client_profiles(id),
  call_reason text,
  disposition text,
  notes text,
  process_step integer,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- CHAT_MESSAGES (AI chat history, linked to client when applicable)
-- =============================================================================
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  user_id uuid REFERENCES auth.users,
  client_id uuid REFERENCES public.client_profiles(id),
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- LEADS (website/form submissions)
-- =============================================================================
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  visitor_id text,
  consent_given boolean DEFAULT false,
  source text,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- USER_DOCUMENTS (documents uploaded by staff/users)
-- =============================================================================
CREATE TABLE public.user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  summary text,
  uploaded_at timestamptz DEFAULT now()
);

-- =============================================================================
-- SENT_MESSAGES (outbound emails)
-- =============================================================================
CREATE TABLE public.sent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id),
  sender_name text,
  recipient_email text NOT NULL,
  subject text,
  body text NOT NULL,
  sent_at timestamptz DEFAULT now()
);

-- =============================================================================
-- INCOMING_EMAILS (inbound emails)
-- =============================================================================
CREATE TABLE public.incoming_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text UNIQUE NOT NULL,
  from_email text NOT NULL,
  to_email text,
  subject text,
  body text,
  received_at timestamptz DEFAULT now(),
  client_id uuid REFERENCES public.client_profiles(id)
);

CREATE INDEX idx_incoming_emails_message_id ON public.incoming_emails(message_id);
CREATE INDEX idx_incoming_emails_received ON public.incoming_emails(received_at);

-- =============================================================================
-- REMINDERS (full Kloudy-style)
-- =============================================================================
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES auth.users NOT NULL,
  target_user_id uuid REFERENCES auth.users NOT NULL,
  client_id uuid REFERENCES public.client_profiles(id),
  remind_at timestamptz NOT NULL,
  text text NOT NULL,
  alert_earlier_minutes integer DEFAULT 0,
  repeat_count integer DEFAULT 1,
  repeat_interval_minutes integer DEFAULT 0,
  alert_count integer DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reminders_target ON public.reminders(target_user_id);
CREATE INDEX idx_reminders_remind_at ON public.reminders(remind_at);

-- =============================================================================
-- NOTIFICATION_VIEWS (seen/marked items)
-- =============================================================================
CREATE TABLE public.notification_views (
  item_type text NOT NULL,
  item_id text NOT NULL,
  seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (item_type, item_id)
);

-- =============================================================================
-- MESSAGE_AUTO_RESPONSES (AI auto-response state)
-- =============================================================================
CREATE TABLE public.message_auto_responses (
  item_type text NOT NULL,
  item_id text NOT NULL,
  auto_mode_on boolean DEFAULT true,
  ai_response text,
  needs_human boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (item_type, item_id)
);

-- =============================================================================
-- AUTO_MODE_SETTINGS (key-value config)
-- =============================================================================
CREATE TABLE public.auto_mode_settings (
  key text PRIMARY KEY,
  value text
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_call_notes_client ON public.call_notes(client_id);
CREATE INDEX idx_call_notes_user ON public.call_notes(user_id);
CREATE INDEX idx_client_profiles_full_name ON public.client_profiles(full_name);
CREATE INDEX idx_client_profiles_state ON public.client_profiles(state);
CREATE INDEX idx_documents_client ON public.documents(client_id);
CREATE INDEX idx_document_notes_document ON public.document_notes(document_id);
CREATE INDEX idx_chat_messages_client ON public.chat_messages(client_id);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX idx_sent_messages_client ON public.sent_messages(client_id);
CREATE INDEX idx_user_documents_user ON public.user_documents(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_auto_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_mode_settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "client_profiles_select" ON public.client_profiles FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = caregiver_id OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
);
CREATE POLICY "client_profiles_insert" ON public.client_profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('caregiver','csr_admin','management_admin'))
);
CREATE POLICY "client_profiles_update" ON public.client_profiles FOR UPDATE USING (
  auth.uid() = caregiver_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
);

CREATE POLICY "documents_select" ON public.documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))))
);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (cp.caregiver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))))
);
CREATE POLICY "documents_update" ON public.documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (cp.caregiver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))))
);
CREATE POLICY "documents_delete" ON public.documents FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (cp.caregiver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))))
);

CREATE POLICY "document_notes_all" ON public.document_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND (
    EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = d.client_id AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))))
  ))
);

CREATE POLICY "call_notes_all" ON public.call_notes FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin')));

CREATE POLICY "chat_messages_all" ON public.chat_messages FOR ALL USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
);

CREATE POLICY "leads_admin" ON public.leads FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
);

CREATE POLICY "user_documents_own" ON public.user_documents FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "sent_messages_select" ON public.sent_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))))
);

CREATE POLICY "incoming_emails_select" ON public.incoming_emails FOR SELECT USING (
  client_id IS NULL OR EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))))
);

CREATE POLICY "reminders_all" ON public.reminders FOR ALL USING (auth.uid() = creator_id OR auth.uid() = target_user_id);

CREATE POLICY "notification_views_auth" ON public.notification_views FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "message_auto_responses_admin" ON public.message_auto_responses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
);

CREATE POLICY "auto_mode_settings_admin" ON public.auto_mode_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
);

-- =============================================================================
-- TRIGGER: Create profile on signup
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(NULLIF(EXCLUDED.role, ''), public.profiles.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
