-- 50 MB per user per month limit for caregivers and clients (admins excluded)
-- Run in Supabase SQL Editor
-- Hosted Postgres default statement_timeout can kill index builds under Disk IO; PGOPTIONS is not always honored by supabase CLI.
SET statement_timeout TO 0;
SET lock_timeout TO '120s';

CREATE TABLE IF NOT EXISTS public.user_upload_usage (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month text NOT NULL,
  bytes_used bigint DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_user_upload_usage_month ON public.user_upload_usage(month);

ALTER TABLE public.user_upload_usage ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own row
DROP POLICY IF EXISTS "user_upload_usage_own" ON public.user_upload_usage;
CREATE POLICY "user_upload_usage_own" ON public.user_upload_usage
  FOR ALL USING (auth.uid() = user_id);
