-- Reduce Disk IO / CPU: RLS policies that subquery public.profiles cause recursion or extra reads.
-- Open tabs poll Message Center frequently; failed RLS amplifies load (Supabase Disk IO budget).
-- Replaces EXISTS (SELECT 1 FROM profiles ...) with SECURITY DEFINER helpers.

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

CREATE OR REPLACE FUNCTION public.is_caregiver_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('caregiver','csr_admin','management_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved_supervisor() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_caregiver_or_manager() TO authenticated, service_role;

DROP POLICY IF EXISTS "profiles_select_managers" ON public.profiles;
CREATE POLICY "profiles_select_managers" ON public.profiles FOR SELECT
  USING (public.is_manager());

DROP POLICY IF EXISTS "profiles_update_supervisor" ON public.profiles;
CREATE POLICY "profiles_update_supervisor" ON public.profiles FOR UPDATE
  USING (public.is_approved_supervisor());

DROP POLICY IF EXISTS "client_profiles_select" ON public.client_profiles;
CREATE POLICY "client_profiles_select" ON public.client_profiles FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = caregiver_id OR public.is_manager()
);

DROP POLICY IF EXISTS "client_profiles_insert" ON public.client_profiles;
CREATE POLICY "client_profiles_insert" ON public.client_profiles FOR INSERT WITH CHECK (
  public.is_caregiver_or_manager()
);

DROP POLICY IF EXISTS "client_profiles_update" ON public.client_profiles;
CREATE POLICY "client_profiles_update" ON public.client_profiles FOR UPDATE USING (
  auth.uid() = caregiver_id OR public.is_manager()
);

DROP POLICY IF EXISTS "activity_log_all" ON public.activity_log;
CREATE POLICY "activity_log_all" ON public.activity_log FOR ALL USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.id = client_id AND (
      cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
    )
  )
);

DROP POLICY IF EXISTS "Users manage own call_notes" ON public.call_notes;
DROP POLICY IF EXISTS "call_notes_all" ON public.call_notes;
CREATE POLICY "call_notes_all" ON public.call_notes FOR ALL USING (
  auth.uid() = user_id OR public.is_manager()
);

DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "chat_messages_all" ON public.chat_messages;
    EXECUTE $p$
      CREATE POLICY "chat_messages_all" ON public.chat_messages FOR ALL USING (
        auth.uid() = user_id OR public.is_manager()
      )
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    DROP POLICY IF EXISTS "documents_select" ON public.documents;
    DROP POLICY IF EXISTS "documents_insert" ON public.documents;
    DROP POLICY IF EXISTS "documents_update" ON public.documents;
    DROP POLICY IF EXISTS "documents_delete" ON public.documents;
    EXECUTE $p$
      CREATE POLICY "documents_select" ON public.documents FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
    EXECUTE $p$
      CREATE POLICY "documents_insert" ON public.documents FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
    EXECUTE $p$
      CREATE POLICY "documents_update" ON public.documents FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
    EXECUTE $p$
      CREATE POLICY "documents_delete" ON public.documents FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
  END IF;

  IF to_regclass('public.document_notes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "document_notes_all" ON public.document_notes;
    EXECUTE $p$
      CREATE POLICY "document_notes_all" ON public.document_notes FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_id AND EXISTS (
            SELECT 1 FROM public.client_profiles cp
            WHERE cp.id = d.client_id AND (
              cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
            )
          )
        )
      )
    $p$;
  END IF;

  IF to_regclass('public.sent_messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "sent_messages_select" ON public.sent_messages;
    EXECUTE $p$
      CREATE POLICY "sent_messages_select" ON public.sent_messages FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
  END IF;

  IF to_regclass('public.incoming_emails') IS NOT NULL THEN
    DROP POLICY IF EXISTS "incoming_emails_select" ON public.incoming_emails;
    EXECUTE $p$
      CREATE POLICY "incoming_emails_select" ON public.incoming_emails FOR SELECT USING (
        client_id IS NULL OR EXISTS (
          SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
            cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
          )
        )
      )
    $p$;
  END IF;

  IF to_regclass('public.leads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "leads_admin" ON public.leads;
    EXECUTE $p$CREATE POLICY "leads_admin" ON public.leads FOR ALL USING (public.is_manager())$p$;
  END IF;

  IF to_regclass('public.message_auto_responses') IS NOT NULL THEN
    DROP POLICY IF EXISTS "message_auto_responses_admin" ON public.message_auto_responses;
    EXECUTE $p$CREATE POLICY "message_auto_responses_admin" ON public.message_auto_responses FOR ALL USING (public.is_manager())$p$;
  END IF;

  IF to_regclass('public.auto_mode_settings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "auto_mode_settings_admin" ON public.auto_mode_settings;
    EXECUTE $p$CREATE POLICY "auto_mode_settings_admin" ON public.auto_mode_settings FOR ALL USING (public.is_manager())$p$;
  END IF;

  IF to_regclass('public.registration_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "registration_requests_supervisor" ON public.registration_requests;
    EXECUTE $p$
      CREATE POLICY "registration_requests_supervisor" ON public.registration_requests FOR ALL
        USING (public.is_approved_supervisor())
    $p$;
  END IF;

  IF to_regclass('public.encounters') IS NOT NULL THEN
    DROP POLICY IF EXISTS "encounters_all" ON public.encounters;
    EXECUTE $p$
      CREATE POLICY "encounters_all" ON public.encounters FOR ALL USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
  END IF;

  IF to_regclass('public.clinical_notes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "clinical_notes_all" ON public.clinical_notes;
    EXECUTE $p$
      CREATE POLICY "clinical_notes_all" ON public.clinical_notes FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.encounters e
          JOIN public.client_profiles cp ON cp.id = e.client_id
          WHERE e.id = encounter_id AND (
            cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
          )
        )
      )
    $p$;
  END IF;

  IF to_regclass('public.appointments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "appointments_all" ON public.appointments;
    EXECUTE $p$
      CREATE POLICY "appointments_all" ON public.appointments FOR ALL USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
  END IF;

  IF to_regclass('public.client_medications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "client_medications_all" ON public.client_medications;
    EXECUTE $p$
      CREATE POLICY "client_medications_all" ON public.client_medications FOR ALL USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
  END IF;

  IF to_regclass('public.client_allergies') IS NOT NULL THEN
    DROP POLICY IF EXISTS "client_allergies_all" ON public.client_allergies;
    EXECUTE $p$
      CREATE POLICY "client_allergies_all" ON public.client_allergies FOR ALL USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
  END IF;

  IF to_regclass('public.client_vitals') IS NOT NULL THEN
    DROP POLICY IF EXISTS "client_vitals_all" ON public.client_vitals;
    EXECUTE $p$
      CREATE POLICY "client_vitals_all" ON public.client_vitals FOR ALL USING (
        EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
          cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR public.is_manager()
        ))
      )
    $p$;
  END IF;
END $$;
