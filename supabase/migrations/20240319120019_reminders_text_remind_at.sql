-- Align reminders with MessageCenterPIP: add text, remind_at when using migration 001+014 path
-- MessageCenterPIP expects: id, text, remind_at, client_id with target_user_id, status
-- Migration 001 creates: user_id, title, due_at
-- Migration 014 adds: target_user_id, status
-- This adds: text (from title), remind_at (from due_at)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reminders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'text') THEN
      ALTER TABLE public.reminders ADD COLUMN text text DEFAULT 'Reminder';
      UPDATE public.reminders SET text = COALESCE(title, 'Reminder') WHERE text IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'remind_at') THEN
      ALTER TABLE public.reminders ADD COLUMN remind_at timestamptz DEFAULT now();
      UPDATE public.reminders SET remind_at = due_at WHERE remind_at IS NULL AND due_at IS NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'client_id') THEN
      ALTER TABLE public.reminders ADD COLUMN client_id uuid REFERENCES public.client_profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'creator_id') THEN
      ALTER TABLE public.reminders ADD COLUMN creator_id uuid REFERENCES auth.users(id);
      UPDATE public.reminders SET creator_id = user_id WHERE creator_id IS NULL AND user_id IS NOT NULL;
    END IF;
    -- Align RLS: allow creator_id/target_user_id (add_reminder tool) and user_id (migration 001)
    DROP POLICY IF EXISTS "Users manage own reminders" ON public.reminders;
    DROP POLICY IF EXISTS "reminders_all" ON public.reminders;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reminders' AND column_name = 'user_id') THEN
      CREATE POLICY "reminders_all" ON public.reminders FOR ALL USING (
        auth.uid() = user_id OR auth.uid() = creator_id OR auth.uid() = target_user_id
      );
    ELSE
      CREATE POLICY "reminders_all" ON public.reminders FOR ALL USING (
        auth.uid() = creator_id OR auth.uid() = target_user_id
      );
    END IF;
  END IF;
END $$;
