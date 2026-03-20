-- Remove temporary test tables when closing test repo
-- Run in Supabase SQL Editor when done testing

DROP TABLE IF EXISTS public.test_client_profiles CASCADE;
DROP TABLE IF EXISTS public.test_profiles CASCADE;
