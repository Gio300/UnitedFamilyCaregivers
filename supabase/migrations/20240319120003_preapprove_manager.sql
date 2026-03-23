-- Pre-approve johnny.allen32@yahoo.com as manager (supervisor mode)
-- Run after schema_full.sql and after the user has signed up.
UPDATE public.profiles p
SET approved_at = now(), role = 'management_admin'
FROM auth.users u
WHERE p.id = u.id AND u.email = 'johnny.allen32@yahoo.com';
