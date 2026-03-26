-- Run in Supabase SQL Editor only if migration 022 was applied manually (not via supabase db push).
-- After `supabase db push`, this row is usually already present — safe to run (ON CONFLICT DO NOTHING).

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20240319120022', 'direct_messages_messaging_rpcs')
ON CONFLICT (version) DO NOTHING;

SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '20240319120022';
