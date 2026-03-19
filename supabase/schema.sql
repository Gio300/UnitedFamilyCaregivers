-- UnitedFamilyCaregivers - Initial schema
-- Run this in Supabase SQL Editor after creating your project

-- Users come from Supabase Auth; we extend with profiles
create table if not exists public.profiles (
  id uuid references auth.users primary key,
  full_name text,
  role text default 'client' check (role in ('client','caregiver','csr_admin','management_admin')),
  caregiver_id uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clients linked to caregivers (caregiver can change)
create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  caregiver_id uuid references auth.users(id),
  full_name text,
  dob date,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.client_profiles enable row level security;

-- RLS policies (simplified; expand per role)
create policy "Users see own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users see own client profile" on public.client_profiles for select using (auth.uid() = user_id);
