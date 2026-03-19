-- UnitedFamilyCaregivers - Initial schema
-- Run this in Supabase SQL Editor after creating your project

-- Users come from Supabase Auth; we extend with profiles
create table if not exists public.profiles (
  id uuid references auth.users primary key,
  full_name text,
  role text default 'client' check (role in ('client','caregiver','csr_admin','management_admin')),
  caregiver_id uuid references auth.users(id),
  approved_at timestamptz,
  onboarding_completed boolean default false,
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

-- Call notes (extracted from calls, linked to user/client)
create table if not exists public.call_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  client_id uuid references auth.users(id),
  call_reason text,
  disposition text,
  notes text,
  created_at timestamptz default now()
);

-- Reminders for users
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.call_notes enable row level security;
alter table public.reminders enable row level security;

-- RLS policies (simplified; expand per role)
create policy "Users see own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users see own client profile" on public.client_profiles for select using (auth.uid() = user_id);
create policy "Users manage own call_notes" on public.call_notes for all using (auth.uid() = user_id);
create policy "Users manage own reminders" on public.reminders for all using (auth.uid() = user_id);
