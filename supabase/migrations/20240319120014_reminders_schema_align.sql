-- Align reminders with schema expected by useMessageCenterUnread
-- Migration 001 creates reminders with user_id only; this adds target_user_id and status
SET statement_timeout TO 0;
SET lock_timeout TO '120s';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reminders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reminders' AND column_name='target_user_id') THEN
      ALTER TABLE public.reminders ADD COLUMN target_user_id uuid REFERENCES auth.users(id);
      UPDATE public.reminders SET target_user_id = user_id WHERE target_user_id IS NULL AND user_id IS NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reminders' AND column_name='status') THEN
      ALTER TABLE public.reminders ADD COLUMN status text DEFAULT 'pending';
      UPDATE public.reminders SET status = 'pending' WHERE status IS NULL;
    END IF;
  END IF;
END $$;
