-- Interview / eligibility call notes for appeals tracking; optional AI summary from gateway
-- account_disabled: soft block checked in app AuthGuard

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_disabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.interview_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text,
  client_id uuid REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  call_type text NOT NULL DEFAULT 'eligibility_medicaid',
  room_name text,
  raw_notes text,
  ai_summary text,
  outcome text CHECK (outcome IS NULL OR outcome IN ('approved', 'denied', 'unknown')),
  structured jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_call_logs_user ON public.interview_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_call_logs_created ON public.interview_call_logs(created_at DESC);

ALTER TABLE public.interview_call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interview_call_logs_insert_own" ON public.interview_call_logs;
DROP POLICY IF EXISTS "interview_call_logs_select_own" ON public.interview_call_logs;
DROP POLICY IF EXISTS "interview_call_logs_select_admin" ON public.interview_call_logs;
DROP POLICY IF EXISTS "interview_call_logs_update_own" ON public.interview_call_logs;

CREATE POLICY "interview_call_logs_insert_own" ON public.interview_call_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interview_call_logs_select_own" ON public.interview_call_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "interview_call_logs_update_own" ON public.interview_call_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interview_call_logs_select_admin" ON public.interview_call_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approved_at IS NOT NULL
        AND p.role IN ('csr_admin', 'management_admin')
    )
  );

COMMENT ON TABLE public.interview_call_logs IS 'User or staff notes from Medicaid/Gainwell-style calls; summaries must reflect raw_notes only.';

CREATE TABLE IF NOT EXISTS public.developer_allowlist (
  email text PRIMARY KEY,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.developer_allowlist ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.developer_allowlist IS 'Optional extra developer emails; managed via service role / gateway. No anon policies.';
