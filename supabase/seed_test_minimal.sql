-- UFCi Minimal Test Profiles: 1 client, 1 caregiver, 1 CSR requesting access
-- Run in Supabase SQL Editor AFTER: schema_full.sql, 003, 004, 005
-- Requires: registration_requests table (004_registration_approval.sql)
--
-- Creates:
-- - Alice Client (client, approved)
-- - Maria Caregiver (caregiver, approved)
-- - Dana CSR (profile exists, approved_at NULL, registration_request pending for csr_admin)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  client_id uuid := 'b2222222-2222-2222-2222-222222222201';
  caregiver_id uuid := 'a1111111-1111-1111-1111-111111111101';
  csr_id uuid := 'c3333333-3333-3333-3333-333333333301';
  inst_id uuid;
BEGIN
  SELECT id INTO inst_id FROM auth.instances LIMIT 1;
  IF inst_id IS NULL THEN inst_id := '00000000-0000-0000-0000-000000000000'; END IF;

  -- Client
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, client_id, 'authenticated', 'authenticated', 'test_client@ufci-test.local', crypt('test123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Alice Client"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Caregiver
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, caregiver_id, 'authenticated', 'authenticated', 'test_caregiver@ufci-test.local', crypt('test123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Maria Caregiver"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- CSR (requesting access - not yet approved)
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, csr_id, 'authenticated', 'authenticated', 'test_csr@ufci-test.local', crypt('test123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Dana CSR"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

END $$;

-- Profiles: client and caregiver approved; CSR has NO approved_at (pending)
INSERT INTO public.profiles (id, full_name, role, approved_at)
VALUES
  ('b2222222-2222-2222-2222-222222222201', 'Alice Client', 'client', now()),
  ('a1111111-1111-1111-1111-111111111101', 'Maria Caregiver', 'caregiver', now()),
  ('c3333333-3333-3333-3333-333333333301', 'Dana CSR', 'client', NULL)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, approved_at = EXCLUDED.approved_at;

-- Client profile: Alice linked to Maria
INSERT INTO public.client_profiles (user_id, caregiver_id, full_name, dob, phone, email, address, city, state, zip, notes, source)
SELECT 'b2222222-2222-2222-2222-222222222201'::uuid, 'a1111111-1111-1111-1111-111111111101'::uuid, 'Alice Client', '1985-03-12'::date, '555-100-1001', 'test_client@ufci-test.local', '100 Oak St', 'Las Vegas', 'NV', '89101', 'Test client', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.user_id = 'b2222222-2222-2222-2222-222222222201'::uuid);

-- Registration request: Dana CSR asking for csr_admin access (pending supervisor approval)
INSERT INTO public.registration_requests (user_id, requested_role, status)
VALUES ('c3333333-3333-3333-3333-333333333301', 'csr_admin', 'pending')
ON CONFLICT (user_id) DO UPDATE SET requested_role = EXCLUDED.requested_role, status = EXCLUDED.status;
