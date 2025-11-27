
export const SUPABASE_SETUP_SQL = `
-- AdGenius Studio Database Schema
-- Run this entire script in your Supabase SQL Editor to initialize the database.

-- 1. Create Tables

create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  name text
);

create table if not exists public.brands (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  website text,
  about text,
  category text,
  target_audience text,
  products jsonb,
  logo_light text,
  logo_dark text,
  updated_at bigint
);

create table if not exists public.projects (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  brand_id text references public.brands(id) on delete set null,
  name text not null,
  description text,
  script jsonb,
  assets jsonb,
  production_config jsonb, -- Phase 1: Timeline & Mixing Settings
  status text,
  created_at bigint,
  updated_at bigint
);

-- Ensure production_config exists (Migration helper for existing tables)
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='projects' and column_name='production_config') then
    alter table public.projects add column production_config jsonb;
  end if;
end $$;

-- SaaS Tables

create table if not exists public.plans (
  id text primary key,
  code text unique not null,
  name text not null,
  price_cents int not null,
  max_brands int,
  max_projects int,
  max_gens_mo int,
  max_videos_mo int
);

-- Seed Plans
insert into public.plans (id, code, name, price_cents, max_brands, max_projects, max_gens_mo, max_videos_mo)
values 
('plan_free', 'free', 'Free', 0, 1, 3, 5, 1),
('plan_starter', 'starter', 'Starter', 1900, 5, 50, 50, 10),
('plan_pro', 'pro', 'Pro', 4900, 9999, 9999, 500, 50)
on conflict (id) do update set 
  price_cents = EXCLUDED.price_cents,
  max_brands = EXCLUDED.max_brands,
  max_projects = EXCLUDED.max_projects,
  max_gens_mo = EXCLUDED.max_gens_mo,
  max_videos_mo = EXCLUDED.max_videos_mo;

create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  plan_code text not null default 'free',
  status text not null,
  renews_at bigint
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  period_start bigint not null,
  period_end bigint not null,
  ad_gens_used int default 0,
  videos_used int default 0
);

-- Admin Tables

DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists public.admins (
  id uuid references auth.users(id) primary key,
  role admin_role default 'support',
  created_at timestamptz default now()
);

create table if not exists public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  project_id text,
  status text, 
  provider text, 
  error_message text,
  created_at timestamptz default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text,
  target_id text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  is_public boolean default false,
  updated_at timestamptz default now()
);

-- Music Library (Phase 2 Feature)
create table if not exists public.music_library (
  id text primary key,
  name text not null,
  genre text,
  mood text,
  url text not null,
  duration int,
  created_at timestamptz default now()
);

-- Seed Music Library
insert into public.music_library (id, name, genre, mood, url, duration)
values
('track_corporate', 'Success Driven', 'Corporate', 'corporate', '', 120),
('track_cinematic', 'Epic Horizon', 'Orchestral', 'cinematic', '', 120),
('track_chill', 'LoFi Study', 'LoFi', 'calm', '', 120),
('track_upbeat', 'Sunny Day', 'Pop', 'playful', '', 120),
('track_rock', 'High Energy', 'Rock', 'energetic', '', 120),
('track_dramatic', 'Suspense Builder', 'Ambient', 'dramatic', '', 120)
on conflict (id) do nothing;

-- 2. Enable Row Level Security (RLS)

alter table public.users enable row level security;
alter table public.brands enable row level security;
alter table public.projects enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.admins enable row level security;
alter table public.video_jobs enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.system_settings enable row level security;
alter table public.music_library enable row level security;

-- 3. Create Policies

-- Users
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Brands
drop policy if exists "Users can manage own brands" on public.brands;
create policy "Users can manage own brands" on public.brands for all using (auth.uid() = user_id);

-- Projects
drop policy if exists "Users can manage own projects" on public.projects;
create policy "Users can manage own projects" on public.projects for all using (auth.uid() = user_id);

-- SaaS
drop policy if exists "Everyone can read plans" on public.plans;
create policy "Everyone can read plans" on public.plans for select using (true);

drop policy if exists "Users can read own sub" on public.subscriptions;
create policy "Users can read own sub" on public.subscriptions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own sub" on public.subscriptions;
create policy "Users can insert own sub" on public.subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own sub" on public.subscriptions;
create policy "Users can update own sub" on public.subscriptions for update using (auth.uid() = user_id); 

drop policy if exists "Users can read own usage" on public.usage_counters;
create policy "Users can read own usage" on public.usage_counters for select using (auth.uid() = user_id);

drop policy if exists "Users can update own usage" on public.usage_counters;
create policy "Users can update own usage" on public.usage_counters for update using (auth.uid() = user_id);

drop policy if exists "Users can insert own usage" on public.usage_counters;
create policy "Users can insert own usage" on public.usage_counters for insert with check (auth.uid() = user_id);

-- Admin
drop policy if exists "Admins can view all users" on public.users;
create policy "Admins can view all users" on public.users for select using (
  exists (select 1 from public.admins where id = auth.uid())
);

drop policy if exists "Admins can view all projects" on public.projects;
create policy "Admins can view all projects" on public.projects for select using (
  exists (select 1 from public.admins where id = auth.uid())
);

drop policy if exists "Admins can view all jobs" on public.video_jobs;
create policy "Admins can view all jobs" on public.video_jobs for select using (
  exists (select 1 from public.admins where id = auth.uid())
);

drop policy if exists "Admins can update users" on public.users;
create policy "Admins can update users" on public.users for update using (
  exists (select 1 from public.admins where id = auth.uid())
);

drop policy if exists "Admins can update jobs" on public.video_jobs;
create policy "Admins can update jobs" on public.video_jobs for update using (
  exists (select 1 from public.admins where id = auth.uid())
);

-- System Settings
drop policy if exists "Admins manage settings" on public.system_settings;
create policy "Admins manage settings" on public.system_settings for all using (
  exists (select 1 from public.admins where id = auth.uid())
);

-- Music Library
drop policy if exists "Everyone can read music" on public.music_library;
create policy "Everyone can read music" on public.music_library for select using (true);

drop policy if exists "Admins manage music" on public.music_library;
create policy "Admins manage music" on public.music_library for all using (
  exists (select 1 from public.admins where id = auth.uid())
);

-- 4. Triggers
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Storage Setup
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'assets' );

drop policy if exists "Authenticated Insert" on storage.objects;
create policy "Authenticated Insert"
  on storage.objects for insert
  with check ( bucket_id = 'assets' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated Update" on storage.objects;
create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'assets' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated Delete" on storage.objects;
create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'assets' and auth.role() = 'authenticated' );

-- 6. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
`;
