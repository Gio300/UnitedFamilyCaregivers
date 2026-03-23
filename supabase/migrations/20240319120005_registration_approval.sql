-- Registration requests for CSR/Manager approval by supervisors
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_role text NOT NULL CHECK (requested_role IN ('csr_admin','management_admin')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON public.registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_user ON public.registration_requests(user_id);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registration_requests_supervisor" ON public.registration_requests;
DROP POLICY IF EXISTS "registration_requests_own" ON public.registration_requests;
DROP POLICY IF EXISTS "profiles_update_supervisor" ON public.profiles;

-- Supervisors (management_admin) can see and manage all requests
CREATE POLICY "registration_requests_supervisor" ON public.registration_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'management_admin' AND p.approved_at IS NOT NULL)
);

-- Users can see their own request
CREATE POLICY "registration_requests_own" ON public.registration_requests FOR SELECT USING (auth.uid() = user_id);

-- Supervisors can update profiles (for approval)
CREATE POLICY "profiles_update_supervisor" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'management_admin' AND p.approved_at IS NOT NULL)
);
