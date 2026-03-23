-- Seed test_profiles with sample data for development when profiles table has no/limited data
-- Run after 009_test_profiles_temporary.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.test_profiles WHERE id = 'd4444444-4444-4444-4444-444444444401'::uuid) THEN
    INSERT INTO public.test_profiles (id, full_name, role, approved_at)
    VALUES ('d4444444-4444-4444-4444-444444444401'::uuid, 'Alice Client', 'client', now());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.test_profiles WHERE id = 'e5555555-5555-5555-5555-555555555501'::uuid) THEN
    INSERT INTO public.test_profiles (id, full_name, role, approved_at)
    VALUES ('e5555555-5555-5555-5555-555555555501'::uuid, 'Maria Caregiver', 'caregiver', now());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.test_profiles WHERE id = 'f6666666-6666-6666-6666-666666666601'::uuid) THEN
    INSERT INTO public.test_profiles (id, full_name, role, approved_at)
    VALUES ('f6666666-6666-6666-6666-666666666601'::uuid, 'John CSR', 'csr_admin', now());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.test_client_profiles WHERE client_id = 'd4444444-4444-4444-4444-444444444401'::uuid) THEN
    INSERT INTO public.test_client_profiles (client_id, caregiver_id, full_name)
    VALUES ('d4444444-4444-4444-4444-444444444401'::uuid, 'e5555555-5555-5555-5555-555555555501'::uuid, 'Alice Client');
  END IF;
END $$;
