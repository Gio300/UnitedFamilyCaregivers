-- Use this when you ran schema_full.sql (Family Caregiver Profiles) first.
-- schema_full already has call_notes, reminders, RLS. Only add missing profile column.
alter table public.profiles add column if not exists onboarding_completed boolean default false;
