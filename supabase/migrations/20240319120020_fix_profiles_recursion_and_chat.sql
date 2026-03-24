-- One-shot fix: profiles RLS recursion + chat_sessions/chat_messages
-- Log evidence: infinite recursion in profiles policy; chat_sessions table not found
SET statement_timeout TO 0;
SET lock_timeout TO '120s';

-- 1. Fix profiles recursion: use SECURITY DEFINER functions (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('csr_admin','management_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('management_admin', 'csr_admin')
    AND approved_at IS NOT NULL
  );
$$;

DROP POLICY IF EXISTS "profiles_select_managers" ON public.profiles;
CREATE POLICY "profiles_select_managers" ON public.profiles FOR SELECT
  USING (public.is_manager());

DROP POLICY IF EXISTS "profiles_update_supervisor" ON public.profiles;
CREATE POLICY "profiles_update_supervisor" ON public.profiles FOR UPDATE
  USING (public.is_approved_supervisor());

-- 2. chat_sessions (from 015)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Chat',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON public.chat_sessions(updated_at DESC);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_sessions_own" ON public.chat_sessions;
CREATE POLICY "chat_sessions_own" ON public.chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. chat_messages if missing (015 expects it; no other migration creates it)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  user_id uuid REFERENCES auth.users(id),
  client_id uuid REFERENCES public.client_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_all" ON public.chat_messages;
CREATE POLICY "chat_messages_all" ON public.chat_messages FOR ALL
  USING (auth.uid() = user_id OR public.is_manager());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chat_messages' AND column_name='session_id') THEN
    ALTER TABLE public.chat_messages ADD COLUMN session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
  END IF;
END $$;
