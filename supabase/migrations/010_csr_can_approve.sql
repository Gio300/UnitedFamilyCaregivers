-- Allow CSR admins to also approve registration requests
-- Run after 004_registration_approval.sql

DROP POLICY IF EXISTS "registration_requests_supervisor" ON public.registration_requests;
DROP POLICY IF EXISTS "profiles_update_supervisor" ON public.profiles;

-- Supervisors and CSR admins can see and manage all requests (both need approved_at)
CREATE POLICY "registration_requests_supervisor" ON public.registration_requests FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('management_admin', 'csr_admin')
    AND p.approved_at IS NOT NULL
  )
);

-- Supervisors and CSR admins can update profiles (for approval)
CREATE POLICY "profiles_update_supervisor" ON public.profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('management_admin', 'csr_admin')
    AND p.approved_at IS NOT NULL
  )
);
