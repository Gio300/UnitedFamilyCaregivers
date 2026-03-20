-- UFCi Test Profiles (temporary - no auth.users required)
-- Run in Supabase SQL Editor AFTER migration 008_test_profiles_temporary.sql
-- Creates: 2 caregivers, 3 clients, 1 CSR, 1 manager + client links
-- ProfilesPanel shows these when profiles table is empty (no signups yet)
-- Delete when done: run cleanup_test_profiles_temporary.sql

-- Fixed UUIDs for reference
-- Caregivers: t111... t112...
-- Clients: t221... t222... t223...
-- CSR: t331... Manager: t441...

INSERT INTO public.test_profiles (id, full_name, role, approved_at)
VALUES
  ('t1111111-1111-1111-1111-111111111101'::uuid, 'Maria Caregiver', 'caregiver', now()),
  ('t1111111-1111-1111-1111-111111111102'::uuid, 'James Caregiver', 'caregiver', now()),
  ('t2222222-2222-2222-2222-222222222201'::uuid, 'Alice Client', 'client', now()),
  ('t2222222-2222-2222-2222-222222222202'::uuid, 'Bob Client', 'client', now()),
  ('t2222222-2222-2222-2222-222222222203'::uuid, 'Carol Client', 'client', now()),
  ('t3333333-3333-3333-3333-333333333301'::uuid, 'Dana CSR', 'csr_admin', now()),
  ('t4444444-4444-4444-4444-444444444401'::uuid, 'Manager User', 'management_admin', now())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, approved_at = EXCLUDED.approved_at;

-- Client links: Alice & Bob -> Maria; Carol -> James
INSERT INTO public.test_client_profiles (id, client_id, caregiver_id, full_name, dob, phone, email, address, city, state, zip, notes)
VALUES
  ('tc111111-1111-1111-1111-111111111101'::uuid, 't2222222-2222-2222-2222-222222222201'::uuid, 't1111111-1111-1111-1111-111111111101'::uuid, 'Alice Client', '1985-03-12'::date, '555-100-1001', 'alice@test.local', '100 Oak St', 'Las Vegas', 'NV', '89101', 'Test client'),
  ('tc111111-1111-1111-1111-111111111102'::uuid, 't2222222-2222-2222-2222-222222222202'::uuid, 't1111111-1111-1111-1111-111111111101'::uuid, 'Bob Client', '1972-07-22'::date, '555-100-1002', 'bob@test.local', '200 Pine Ave', 'Las Vegas', 'NV', '89102', 'Test client'),
  ('tc111111-1111-1111-1111-111111111103'::uuid, 't2222222-2222-2222-2222-222222222203'::uuid, 't1111111-1111-1111-1111-111111111102'::uuid, 'Carol Client', '1990-11-05'::date, '555-100-1003', 'carol@test.local', '300 Elm Blvd', 'Henderson', 'NV', '89014', 'Test client')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, dob = EXCLUDED.dob, phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address, city = EXCLUDED.city, state = EXCLUDED.state, zip = EXCLUDED.zip, notes = EXCLUDED.notes;

