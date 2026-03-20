-- Safe migration: Add profile columns if they don't exist (no DROP, no data loss)
-- Run this in Supabase SQL Editor if you get 406 errors or "column does not exist"

-- Add theme to profiles (if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='theme') THEN
    ALTER TABLE public.profiles ADD COLUMN theme text DEFAULT 'light' CHECK (theme IN ('light','dark'));
  END IF;
END $$;

-- Add accent_color to profiles (if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='accent_color') THEN
    ALTER TABLE public.profiles ADD COLUMN accent_color text DEFAULT 'emerald';
  END IF;
END $$;

-- Create activity_log if missing
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  client_id uuid REFERENCES public.client_profiles(id),
  action_type text NOT NULL,
  details jsonb,
  noted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on activity_log if not already
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create activity_log policy if missing
DROP POLICY IF EXISTS "activity_log_all" ON public.activity_log;
CREATE POLICY "activity_log_all" ON public.activity_log FOR ALL USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_client ON public.activity_log(client_id);
