-- Approve johnny.allen32@yahoo.com as manager (supervisor mode)
-- Idempotent: safe to run multiple times
UPDATE public.profiles p
SET approved_at = now(), role = 'management_admin'
FROM auth.users u
WHERE p.id = u.id AND u.email = 'johnny.allen32@yahoo.com';
