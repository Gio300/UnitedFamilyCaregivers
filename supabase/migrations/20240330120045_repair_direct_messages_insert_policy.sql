-- Repair environments where 022 failed mid-file (INSERT policy referenced is_allowed_dm_recipient before it existed).
SET statement_timeout TO 0;

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

DROP POLICY IF EXISTS "direct_messages_insert" ON public.direct_messages;
CREATE POLICY "direct_messages_insert" ON public.direct_messages
  FOR INSERT WITH CHECK (
    from_user_id = auth.uid()
    AND public.is_allowed_dm_recipient(to_user_id)
  );
