-- Run after 20240327120022_support_call_queue.sql is applied.

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20240327120022', 'support_call_queue')
ON CONFLICT (version) DO NOTHING;

SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '20240327120022';
