-- Migration: Add onboarding_completed, call_notes, reminders
-- Idempotent: safe for fresh DB or schema_full-based DB

-- 1. Profile column (always)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- 2. Call notes: create if missing, policy if table has user_id
CREATE TABLE IF NOT EXISTS public.call_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  client_id uuid REFERENCES auth.users(id),
  call_reason text,
  disposition text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_notes' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users manage own call_notes" ON public.call_notes;
    CREATE POLICY "Users manage own call_notes" ON public.call_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Reminders: create if missing, policy only when table has user_id
-- (schema_full uses target_user_id/creator_id and has reminders_all)
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reminders' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users manage own reminders" ON public.reminders;
    CREATE POLICY "Users manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
