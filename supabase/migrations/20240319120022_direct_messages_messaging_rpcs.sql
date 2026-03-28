-- Direct messages, sender on sent_messages, messaging RPCs (admin search, allowlist, DM RLS)

SET statement_timeout TO 0;

-- -----------------------------------------------------------------------------
-- sent_messages: who sent (for caregiver/client allowlist)
-- -----------------------------------------------------------------------------
ALTER TABLE public.sent_messages
  ADD COLUMN IF NOT EXISTS sender_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_sent_messages_sender ON public.sent_messages(sender_user_id);

DROP POLICY IF EXISTS "sent_messages_insert" ON public.sent_messages;
CREATE POLICY "sent_messages_insert" ON public.sent_messages FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.id = client_id
    AND (
      public.is_manager()
      OR cp.caregiver_id = auth.uid()
      OR cp.user_id = auth.uid()
    )
  )
);

GRANT INSERT ON public.sent_messages TO authenticated;

-- -----------------------------------------------------------------------------
-- direct_messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_key text NOT NULL,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direct_messages_no_self CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_thread ON public.direct_messages(thread_key, created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_to ON public.direct_messages(to_user_id, created_at);

CREATE OR REPLACE FUNCTION public.direct_messages_set_thread_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.thread_key := md5(
    LEAST(NEW.from_user_id::text, NEW.to_user_id::text)
    || '|'
    || GREATEST(NEW.from_user_id::text, NEW.to_user_id::text)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_direct_messages_thread ON public.direct_messages;
CREATE TRIGGER tr_direct_messages_thread
  BEFORE INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.direct_messages_set_thread_key();

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- is_allowed_dm_recipient MUST exist before policies reference it (Postgres validates at CREATE POLICY).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_allowed_dm_recipient(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_user IS NOT NULL
    AND target_user <> auth.uid()
    AND (
      public.is_manager()
      OR EXISTS (
        SELECT 1 FROM public.call_notes cn
        JOIN public.client_profiles cp ON cp.id = cn.client_id
        WHERE cn.user_id = target_user
          AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.sent_messages sm
        JOIN public.client_profiles cp ON cp.id = sm.client_id
        WHERE sm.sender_user_id = target_user
          AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.incoming_emails ie
        JOIN public.client_profiles cp ON cp.id = ie.client_id
        JOIN auth.users au ON lower(au.email) = lower(trim(ie.from_email))
        WHERE au.id = target_user
          AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid())
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_allowed_dm_recipient(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "direct_messages_select" ON public.direct_messages;
CREATE POLICY "direct_messages_select" ON public.direct_messages
  FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "direct_messages_insert" ON public.direct_messages;
CREATE POLICY "direct_messages_insert" ON public.direct_messages
  FOR INSERT WITH CHECK (
    from_user_id = auth.uid()
    AND public.is_allowed_dm_recipient(to_user_id)
  );

GRANT SELECT, INSERT ON public.direct_messages TO authenticated;

-- -----------------------------------------------------------------------------
-- Admin search (profiles + auth email)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_search_messaging_recipients(q text, result_limit int)
RETURNS TABLE(id uuid, full_name text, role text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.role, au.email::text AS email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE public.is_manager()
    AND (q IS NULL OR trim(q) = '' OR p.full_name ILIKE '%' || trim(q) || '%')
  ORDER BY p.full_name NULLS LAST
  LIMIT LEAST(COALESCE(NULLIF(result_limit, 0), 20), 50);
$$;

GRANT EXECUTE ON FUNCTION public.admin_search_messaging_recipients(text, int) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Allowlisted recipients for caregivers/clients (no admins)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_allowed_message_recipients()
RETURNS TABLE(id uuid, full_name text, role text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT x.id, x.full_name, x.role, x.email
  FROM (
    SELECT p.id, p.full_name, p.role, au.email::text AS email
    FROM public.call_notes cn
    JOIN public.client_profiles cp ON cp.id = cn.client_id
    JOIN public.profiles p ON p.id = cn.user_id
    JOIN auth.users au ON au.id = p.id
    WHERE (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid())
    UNION
    SELECT p.id, p.full_name, p.role, au.email::text AS email
    FROM public.sent_messages sm
    JOIN public.client_profiles cp ON cp.id = sm.client_id
    JOIN public.profiles p ON p.id = sm.sender_user_id
    JOIN auth.users au ON au.id = p.id
    WHERE sm.sender_user_id IS NOT NULL
      AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid())
    UNION
    SELECT p.id, p.full_name, p.role, au.email::text AS email
    FROM public.incoming_emails ie
    JOIN public.client_profiles cp ON cp.id = ie.client_id
    JOIN auth.users au ON lower(au.email) = lower(trim(ie.from_email))
    JOIN public.profiles p ON p.id = au.id
    WHERE (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid())
  ) x
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = auth.uid() AND me.role IN ('csr_admin', 'management_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.list_allowed_message_recipients() TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Optional RPC (same rules as RLS); returns new row id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_direct_message(p_to_user_id uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_to_user_id IS NULL OR p_to_user_id = auth.uid() THEN
    RAISE EXCEPTION 'invalid recipient';
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'empty body';
  END IF;
  IF NOT public.is_allowed_dm_recipient(p_to_user_id) THEN
    RAISE EXCEPTION 'recipient not allowed';
  END IF;
  INSERT INTO public.direct_messages (thread_key, from_user_id, to_user_id, body)
  VALUES ('', auth.uid(), p_to_user_id, trim(p_body))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_direct_message(uuid, text) TO authenticated, service_role;

-- Realtime (ignore if publication missing or table already added)
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages';
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;
