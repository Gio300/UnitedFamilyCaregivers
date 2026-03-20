-- UFCi Test Users Seed
-- Run this AFTER creating the test users in Supabase Dashboard (Auth > Users > Add user).
-- Create users: test.caregiver@example.com, test.client@example.com, test.csr@example.com, test.manager@example.com
-- Use password: TestPass123! (or any secure password)

-- Update profiles for test caregiver
UPDATE public.profiles
SET full_name = 'Test Caregiver', role = 'caregiver', approved_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'test.caregiver@example.com' LIMIT 1);

-- Update profiles for test client
UPDATE public.profiles
SET full_name = 'Test Client', role = 'client', approved_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'test.client@example.com' LIMIT 1);

-- Update profiles for test CSR
UPDATE public.profiles
SET full_name = 'Test CSR', role = 'csr_admin', approved_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'test.csr@example.com' LIMIT 1);

-- Update profiles for test manager
UPDATE public.profiles
SET full_name = 'Test Manager', role = 'management_admin', approved_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'test.manager@example.com' LIMIT 1);

-- Create client_profile linking test.client to test.caregiver
INSERT INTO public.client_profiles (user_id, caregiver_id, full_name, dob, phone, email, address, city, state, zip, notes)
SELECT
  c.id,
  g.id,
  'Test Client',
  '1990-01-15',
  '555-123-4567',
  'test.client@example.com',
  '123 Main St',
  'Las Vegas',
  'NV',
  '89101',
  'Test client for development and QA.'
FROM auth.users c
CROSS JOIN auth.users g
WHERE c.email = 'test.client@example.com'
  AND g.email = 'test.caregiver@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.user_id = c.id AND cp.caregiver_id = g.id
  );
