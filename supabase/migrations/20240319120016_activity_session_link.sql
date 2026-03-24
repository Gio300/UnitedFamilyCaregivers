-- Link activity_log and call_notes to chat sessions for "this chat" vs "all" scope
SET statement_timeout TO 0;
SET lock_timeout TO '120s';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_log') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='session_id') THEN
      ALTER TABLE public.activity_log ADD COLUMN session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_activity_log_session ON public.activity_log(session_id);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='call_notes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='call_notes' AND column_name='session_id') THEN
      ALTER TABLE public.call_notes ADD COLUMN session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_call_notes_session ON public.call_notes(session_id);
    END IF;
  END IF;
END $$;
