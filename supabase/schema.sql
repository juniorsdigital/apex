-- Apex — personal cycling log schema.
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Every table is private to its owner via row level security.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  ftp_watts   integer check (ftp_watts between 0 and 1000),
  weight_kg   numeric(5, 1) check (weight_kg between 0 and 300),
  max_hr      integer check (max_hr between 0 and 250),
  goal_event  text,
  goal_date   date,
  updated_at  timestamptz not null default now()
);

create table if not exists public.rides (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ride_date     date not null,
  title         text,
  ride_type     text not null default 'endurance'
                check (ride_type in ('endurance','recovery','tempo','sweet_spot','threshold','vo2max','sprint','long','race','other')),
  status        text not null default 'completed'
                check (status in ('planned','completed','skipped')),
  duration_min  integer check (duration_min between 0 and 1440),
  distance_km   numeric(7, 2) check (distance_km >= 0),
  elevation_m   integer check (elevation_m >= 0),
  avg_power_w   integer check (avg_power_w >= 0),
  avg_hr        integer check (avg_hr between 0 and 250),
  rpe           smallint check (rpe between 1 and 10),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists rides_user_date_idx on public.rides (user_id, ride_date);

create table if not exists public.readiness (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  check_date  date not null,
  sleep       smallint check (sleep between 1 and 5),
  energy      smallint check (energy between 1 and 5),
  soreness    smallint check (soreness between 1 and 5),
  primary key (user_id, check_date)
);

alter table public.profiles  enable row level security;
alter table public.rides     enable row level security;
alter table public.readiness enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "own rides" on public.rides;
create policy "own rides" on public.rides
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own readiness" on public.readiness;
create policy "own readiness" on public.readiness
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
