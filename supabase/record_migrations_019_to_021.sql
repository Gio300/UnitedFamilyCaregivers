-- Run in Supabase SQL Editor (or: psql "$SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/record_migrations_019_to_021.sql)
-- Call this only after the three migration files have been applied successfully on this database.

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20240319120019', 'reminders_text_remind_at'),
  ('20240319120020', 'fix_profiles_recursion_and_chat'),
  ('20240319120021', 'rls_disk_io_reduce_profiles_subqueries')
ON CONFLICT (version) DO NOTHING;

-- Expect 3 rows if all are recorded
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20240319120019', '20240319120020', '20240319120021')
ORDER BY version;
