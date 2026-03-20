-- Temporary test profiles for development (no auth.users required)
-- Use until testing is complete, then remove: DROP TABLE test_client_profiles, test_profiles;
-- Run after 007_openemr_logic.sql

-- =============================================================================
-- TEST_PROFILES (standalone - no FK to auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.test_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('client','caregiver','csr_admin','management_admin')),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- TEST_CLIENT_PROFILES (clients linked to caregivers - both from test_profiles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.test_client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.test_profiles(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES public.test_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  dob date,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_client_profiles_client ON public.test_client_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_test_client_profiles_caregiver ON public.test_client_profiles(caregiver_id);

ALTER TABLE public.test_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_client_profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read test data (temporary for dev)
CREATE POLICY "test_profiles_select_auth" ON public.test_profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "test_client_profiles_select_auth" ON public.test_client_profiles FOR SELECT
  TO authenticated USING (true);
