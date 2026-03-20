-- Fix 406 / "No users found": Allow managers, caregivers, and clients to see profiles for @ mentions
-- Run in Supabase SQL Editor after schema_full.sql

DROP POLICY IF EXISTS "profiles_select_managers" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_caregiver_clients" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_client_caregivers" ON public.profiles;

-- Managers can see all profiles
CREATE POLICY "profiles_select_managers" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
);

-- Caregivers can see their clients' profiles
CREATE POLICY "profiles_select_caregiver_clients" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.caregiver_id = auth.uid() AND cp.user_id = profiles.id)
);

-- Clients can see their caregivers' profiles
CREATE POLICY "profiles_select_client_caregivers" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.user_id = auth.uid() AND cp.caregiver_id = profiles.id)
);
