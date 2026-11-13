-- TaleTalk - Migration 0009: Interview practice + Answer Bank
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Safe to run more than once. (Role, topics and experience are already in "profiles".)

-- ---------------------------------------------------------------------------
-- interview_sessions: one practice interview.
-- questions = [{ question, type, hint }]
-- turns     = [{ index, answer, voice, feedback, at }]   (one per answered question)
-- ---------------------------------------------------------------------------
create table if not exists public.interview_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode        text not null check (mode in ('hr', 'technical', 'mock')),
  role        text,
  questions   jsonb not null default '[]'::jsonb,
  turns       jsonb not null default '[]'::jsonb,
  report      jsonb,
  ended       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists interview_sessions_user_idx on public.interview_sessions (user_id, updated_at desc);

alter table public.interview_sessions enable row level security;

drop policy if exists "interview_sessions: read own" on public.interview_sessions;
create policy "interview_sessions: read own" on public.interview_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "interview_sessions: insert own" on public.interview_sessions;
create policy "interview_sessions: insert own" on public.interview_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "interview_sessions: update own" on public.interview_sessions;
create policy "interview_sessions: update own" on public.interview_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "interview_sessions: delete own" on public.interview_sessions;
create policy "interview_sessions: delete own" on public.interview_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists interview_sessions_set_updated_at on public.interview_sessions;
create trigger interview_sessions_set_updated_at
  before update on public.interview_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- answer_bank: my best answers to revise before a real interview.
-- ---------------------------------------------------------------------------
create table if not exists public.answer_bank (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question         text not null,
  category         text,                       -- hr, technical, behavioral, ...
  my_answer        text not null,
  improved_answer  text,
  feedback         text,                       -- short note on what made it better
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists answer_bank_user_idx on public.answer_bank (user_id, updated_at desc);

alter table public.answer_bank enable row level security;

drop policy if exists "answer_bank: read own" on public.answer_bank;
create policy "answer_bank: read own" on public.answer_bank
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "answer_bank: insert own" on public.answer_bank;
create policy "answer_bank: insert own" on public.answer_bank
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "answer_bank: update own" on public.answer_bank;
create policy "answer_bank: update own" on public.answer_bank
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "answer_bank: delete own" on public.answer_bank;
create policy "answer_bank: delete own" on public.answer_bank
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists answer_bank_set_updated_at on public.answer_bank;
create trigger answer_bank_set_updated_at
  before update on public.answer_bank
  for each row execute function public.set_updated_at();
