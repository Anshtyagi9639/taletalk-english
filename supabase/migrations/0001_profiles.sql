-- TaleTalk — Migration 0001: profiles
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Safe to run more than once.

-- One row per user with their learning settings.
create table if not exists public.profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  level              text not null default 'A2'
                       check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  interests          text[] not null default '{}',
  daily_goal_minutes integer not null default 25 check (daily_goal_minutes between 5 and 240),
  hindi_help         boolean not null default false,
  voice              text not null default 'browser',      -- 'browser' (free) or an OpenAI voice name
  tts_speed          numeric(3, 2) not null default 1.00,
  placement_done     boolean not null default false,       -- level quiz finished? (Phase 7)
  interview_role     text,                                 -- e.g. 'Frontend developer' (Phase 11)
  interview_topics   text[] not null default '{}',
  experience_level   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Row Level Security: each user can only see and change their own row.
alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep updated_at fresh on every change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a new user is added.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- If you created your user before running this file, make the profile now.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;
