-- Migration: Add onboarding_completed, call_notes, reminders
-- Run in Supabase SQL Editor for existing projects

-- Add onboarding_completed to profiles (if column doesn't exist)
alter table public.profiles add column if not exists onboarding_completed boolean default false;

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

alter table public.call_notes enable row level security;
alter table public.reminders enable row level security;

-- RLS: users see/insert/update own call_notes
create policy "Users manage own call_notes" on public.call_notes
  for all using (auth.uid() = user_id);

-- RLS: users see/insert/update own reminders
create policy "Users manage own reminders" on public.reminders
  for all using (auth.uid() = user_id);
