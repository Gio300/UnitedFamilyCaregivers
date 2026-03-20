-- UFCi Test Profiles (temporary - no real logins)
-- Run in Supabase SQL Editor. Creates fake caregivers, clients, and CSR for manager testing.
-- Delete when done: run cleanup_test_profiles.sql
--
-- If you get "permission denied" on auth.users: create users manually in Auth > Users,
-- then run only the UPDATE profiles and INSERT client_profiles sections below (skip the DO block).

-- Use extensions for password hash (Supabase has pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generate fixed UUIDs so we can reference them
DO $$
DECLARE
  caregiver1_id uuid := 'a1111111-1111-1111-1111-111111111101';
  caregiver2_id uuid := 'a1111111-1111-1111-1111-111111111102';
  client1_id uuid := 'b2222222-2222-2222-2222-222222222201';
  client2_id uuid := 'b2222222-2222-2222-2222-222222222202';
  client3_id uuid := 'b2222222-2222-2222-2222-222222222203';
  csr_id uuid := 'c3333333-3333-3333-3333-333333333301';
  inst_id uuid;
BEGIN
  -- Get instance_id (required for auth.users)
  SELECT id INTO inst_id FROM auth.instances LIMIT 1;
  IF inst_id IS NULL THEN
    inst_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Caregiver 1
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, caregiver1_id, 'authenticated', 'authenticated', 'test_caregiver_1@ufci-test.local', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Maria Caregiver"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Caregiver 2
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, caregiver2_id, 'authenticated', 'authenticated', 'test_caregiver_2@ufci-test.local', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"James Caregiver"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Client 1
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, client1_id, 'authenticated', 'authenticated', 'test_client_1@ufci-test.local', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Alice Client"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Client 2
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, client2_id, 'authenticated', 'authenticated', 'test_client_2@ufci-test.local', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Bob Client"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Client 3
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, client3_id, 'authenticated', 'authenticated', 'test_client_3@ufci-test.local', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Carol Client"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- CSR
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, csr_id, 'authenticated', 'authenticated', 'test_csr@ufci-test.local', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Dana CSR"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

END $$;

-- Profiles are created by handle_new_user trigger. Update roles and approved_at.
UPDATE public.profiles SET full_name = 'Maria Caregiver', role = 'caregiver', approved_at = now()
WHERE id = 'a1111111-1111-1111-1111-111111111101';
UPDATE public.profiles SET full_name = 'James Caregiver', role = 'caregiver', approved_at = now()
WHERE id = 'a1111111-1111-1111-1111-111111111102';
UPDATE public.profiles SET full_name = 'Alice Client', role = 'client', approved_at = now()
WHERE id = 'b2222222-2222-2222-2222-222222222201';
UPDATE public.profiles SET full_name = 'Bob Client', role = 'client', approved_at = now()
WHERE id = 'b2222222-2222-2222-2222-222222222202';
UPDATE public.profiles SET full_name = 'Carol Client', role = 'client', approved_at = now()
WHERE id = 'b2222222-2222-2222-2222-222222222203';
UPDATE public.profiles SET full_name = 'Dana CSR', role = 'csr_admin', approved_at = now()
WHERE id = 'c3333333-3333-3333-3333-333333333301';

-- Insert profiles if trigger didn't create them (e.g. seed run before trigger exists)
INSERT INTO public.profiles (id, full_name, role, approved_at)
VALUES
  ('a1111111-1111-1111-1111-111111111101', 'Maria Caregiver', 'caregiver', now()),
  ('a1111111-1111-1111-1111-111111111102', 'James Caregiver', 'caregiver', now()),
  ('b2222222-2222-2222-2222-222222222201', 'Alice Client', 'client', now()),
  ('b2222222-2222-2222-2222-222222222202', 'Bob Client', 'client', now()),
  ('b2222222-2222-2222-2222-222222222203', 'Carol Client', 'client', now()),
  ('c3333333-3333-3333-3333-333333333301', 'Dana CSR', 'csr_admin', now())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, approved_at = EXCLUDED.approved_at;

-- Client profiles: link clients to caregivers (skip if already exists)
INSERT INTO public.client_profiles (user_id, caregiver_id, full_name, dob, phone, email, address, city, state, zip, notes, source)
SELECT v.user_id, v.caregiver_id, v.full_name, v.dob, v.phone, v.email, v.address, v.city, v.state, v.zip, v.notes, v.source
FROM (VALUES
  ('b2222222-2222-2222-2222-222222222201'::uuid, 'a1111111-1111-1111-1111-111111111101'::uuid, 'Alice Client', '1985-03-12'::date, '555-100-1001', 'test_client_1@ufci-test.local', '100 Oak St', 'Las Vegas', 'NV', '89101', 'Test client - Maria caregiver', 'seed'),
  ('b2222222-2222-2222-2222-222222222202'::uuid, 'a1111111-1111-1111-1111-111111111101'::uuid, 'Bob Client', '1972-07-22'::date, '555-100-1002', 'test_client_2@ufci-test.local', '200 Pine Ave', 'Las Vegas', 'NV', '89102', 'Test client - Maria caregiver', 'seed'),
  ('b2222222-2222-2222-2222-222222222203'::uuid, 'a1111111-1111-1111-1111-111111111102'::uuid, 'Carol Client', '1990-11-05'::date, '555-100-1003', 'test_client_3@ufci-test.local', '300 Elm Blvd', 'Henderson', 'NV', '89014', 'Test client - James caregiver', 'seed')
) AS v(user_id, caregiver_id, full_name, dob, phone, email, address, city, state, zip, notes, source)
WHERE NOT EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.user_id = v.user_id AND cp.caregiver_id = v.caregiver_id);
