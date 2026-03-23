-- OpenEMR-style logic: encounters, clinical notes, appointments, medications, allergies, vitals
-- Run after schema_full.sql and migrations 001-006
-- No OpenEMR dependency; self-contained for non-medical homecare

-- =============================================================================
-- ENCOUNTERS (care visits - EVV-ready)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES auth.users(id),
  encounter_date date NOT NULL,
  encounter_time time,
  reason text,
  notes text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encounters_client ON public.encounters(client_id);
CREATE INDEX IF NOT EXISTS idx_encounters_caregiver ON public.encounters(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_encounters_date ON public.encounters(encounter_date);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "encounters_all" ON public.encounters;
CREATE POLICY "encounters_all" ON public.encounters FOR ALL USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
    cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
  ))
);

-- =============================================================================
-- CLINICAL_NOTES (SOAP notes per encounter)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  subjective text,
  objective text,
  assessment text,
  plan text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_encounter ON public.clinical_notes(encounter_id);

ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinical_notes_all" ON public.clinical_notes;
CREATE POLICY "clinical_notes_all" ON public.clinical_notes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.encounters e
    JOIN public.client_profiles cp ON cp.id = e.client_id
    WHERE e.id = encounter_id AND (
      cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
    )
  )
);

-- =============================================================================
-- APPOINTMENTS (scheduling)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  duration_minutes int DEFAULT 60,
  notes text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_caregiver ON public.appointments(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON public.appointments(start_at);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_all" ON public.appointments;
CREATE POLICY "appointments_all" ON public.appointments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
    cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
  ))
);

-- =============================================================================
-- CLIENT_MEDICATIONS (med list for caregiver awareness)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text,
  instructions text,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_medications_client ON public.client_medications(client_id);

ALTER TABLE public.client_medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_medications_all" ON public.client_medications;
CREATE POLICY "client_medications_all" ON public.client_medications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
    cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
  ))
);

-- =============================================================================
-- CLIENT_ALLERGIES (safety - caregivers must know)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  reaction text,
  severity text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_allergies_client ON public.client_allergies(client_id);

ALTER TABLE public.client_allergies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_allergies_all" ON public.client_allergies;
CREATE POLICY "client_allergies_all" ON public.client_allergies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
    cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
  ))
);

-- =============================================================================
-- CLIENT_VITALS (wellness checks for home care)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  recorded_by uuid REFERENCES auth.users(id),
  recorded_at timestamptz DEFAULT now(),
  weight_lbs decimal,
  bp_systolic int,
  bp_diastolic int,
  pulse int,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_client_vitals_client ON public.client_vitals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_vitals_recorded ON public.client_vitals(recorded_at);

ALTER TABLE public.client_vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_vitals_all" ON public.client_vitals;
CREATE POLICY "client_vitals_all" ON public.client_vitals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND (
    cp.user_id = auth.uid() OR cp.caregiver_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('csr_admin','management_admin'))
  ))
);
