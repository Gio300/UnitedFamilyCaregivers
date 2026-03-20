-- UFCi Extended Test Profiles: Manager + Approved CSR
-- Run AFTER seed_test_minimal.sql
-- Adds: test_manager (management_admin), test_csr_approved (csr_admin)
-- All passwords: test123

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  manager_id uuid := 'd4444444-4444-4444-4444-444444444401';
  csr_approved_id uuid := 'e5555555-5555-5555-5555-555555555501';
  inst_id uuid;
BEGIN
  SELECT id INTO inst_id FROM auth.instances LIMIT 1;
  IF inst_id IS NULL THEN inst_id := '00000000-0000-0000-0000-000000000000'; END IF;

  -- Manager (Supervisor + all modes)
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, manager_id, 'authenticated', 'authenticated', 'test_manager@ufci-test.local', crypt('test123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Manager User"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Approved CSR (Customer Service, Eligibility, Appointments)
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (inst_id, csr_approved_id, 'authenticated', 'authenticated', 'test_csr_approved@ufci-test.local', crypt('test123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Dana CSR Approved"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

END $$;

-- Profiles: manager and approved CSR
INSERT INTO public.profiles (id, full_name, role, approved_at)
VALUES
  ('d4444444-4444-4444-4444-444444444401', 'Manager User', 'management_admin', now()),
  ('e5555555-5555-5555-5555-555555555501', 'Dana CSR Approved', 'csr_admin', now())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, approved_at = EXCLUDED.approved_at;

-- Sample call notes for CSR work list (run after seed_test_minimal has client_profiles)
INSERT INTO public.call_notes (user_id, client_id, call_reason, disposition, notes)
SELECT 'e5555555-5555-5555-5555-555555555501'::uuid, cp.id, 'Eligibility inquiry', 'Completed', 'Verified client eligibility for Nevada Medicaid.'
FROM public.client_profiles cp WHERE cp.user_id = 'b2222222-2222-2222-2222-222222222201'::uuid LIMIT 1;
INSERT INTO public.call_notes (user_id, client_id, call_reason, disposition, notes)
SELECT 'e5555555-5555-5555-5555-555555555501'::uuid, cp.id, 'Document upload', 'Completed', 'Client uploaded ID verification.'
FROM public.client_profiles cp WHERE cp.user_id = 'b2222222-2222-2222-2222-222222222201'::uuid LIMIT 1;
