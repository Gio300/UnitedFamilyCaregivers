-- Training reminders for compliance (auto DM + email)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.training_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL DEFAULT 'annual_training',
  due_date date NOT NULL,
  sent_dm_at timestamptz,
  sent_email_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_reminders_user ON public.training_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_training_reminders_due ON public.training_reminders(due_date);

ALTER TABLE public.training_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_reminders_own" ON public.training_reminders;
CREATE POLICY "training_reminders_own" ON public.training_reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
