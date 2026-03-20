-- Fix RLS recursion: profiles_select_managers caused 500 errors
-- Run in Supabase SQL Editor after 003_profiles_rls_mention.sql

DROP POLICY IF EXISTS "profiles_select_managers" ON public.profiles;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('csr_admin','management_admin')
  );
$$;

CREATE POLICY "profiles_select_managers" ON public.profiles FOR SELECT
USING (public.is_manager());
