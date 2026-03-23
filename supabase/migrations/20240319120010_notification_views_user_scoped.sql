-- Message Center: per-user seen tracking for notifications
-- Run after 008. Enables unread count and "mark as seen" per user.
-- If notification_views exists from schema_full (no user_id), we replace it.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_views') THEN
    DROP POLICY IF EXISTS "notification_views_auth" ON public.notification_views;
    DROP TABLE public.notification_views CASCADE;
  END IF;
END $$;

CREATE TABLE public.notification_views (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id text NOT NULL,
  seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_views_user ON public.notification_views(user_id);

ALTER TABLE public.notification_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_views_own" ON public.notification_views;
CREATE POLICY "notification_views_own" ON public.notification_views FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
