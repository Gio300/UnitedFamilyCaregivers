-- Support call queue: caregivers in cs-voice-* rooms wait for CSR pickup

CREATE TABLE public.support_call_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name text NOT NULL,
  caller_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'claimed', 'completed', 'abandoned', 'expired')),
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

CREATE UNIQUE INDEX support_call_queue_room_active
  ON public.support_call_queue (room_name)
  WHERE status IN ('waiting', 'claimed');

CREATE INDEX support_call_queue_waiting_created
  ON public.support_call_queue (created_at ASC)
  WHERE status = 'waiting';

CREATE OR REPLACE FUNCTION public.support_call_queue_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_call_queue_updated_at
  BEFORE UPDATE ON public.support_call_queue
  FOR EACH ROW EXECUTE FUNCTION public.support_call_queue_set_updated_at();

ALTER TABLE public.support_call_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_queue_insert_caller
  ON public.support_call_queue FOR INSERT
  WITH CHECK (caller_user_id = auth.uid());

CREATE POLICY support_queue_select
  ON public.support_call_queue FOR SELECT
  USING (
    caller_user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('csr_admin', 'management_admin')
      )
      AND (
        status = 'waiting'
        OR claimed_by = auth.uid()
      )
    )
  );

CREATE POLICY support_queue_caller_update
  ON public.support_call_queue FOR UPDATE
  USING (caller_user_id = auth.uid())
  WITH CHECK (caller_user_id = auth.uid());

CREATE POLICY support_queue_csr_claim
  ON public.support_call_queue FOR UPDATE
  USING (
    status = 'waiting'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('csr_admin', 'management_admin')
    )
  )
  WITH CHECK (status = 'claimed' AND claimed_by = auth.uid());

CREATE POLICY support_queue_csr_complete
  ON public.support_call_queue FOR UPDATE
  USING (claimed_by = auth.uid() AND status = 'claimed')
  WITH CHECK (claimed_by = auth.uid());

COMMENT ON TABLE public.support_call_queue IS 'LiveKit cs-voice queue: CSR claims room_name and joins same room';

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_call_queue';
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;
