-- TaleTalk - Migration 0007: AI stories, mistakes notebook, daily plan
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Run 0001-0006 first. Safe to run more than once.

-- Key words for a chapter (AI stories, and the chapter check): [{ word, meaning, example }]
alter table public.chapters add column if not exists key_words jsonb;

-- ---------------------------------------------------------------------------
-- mistakes: my mistakes notebook (from Talk, Practice, retelling a chapter, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.mistakes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  wrong             text not null,
  "right"           text not null,
  reason            text,
  type              text not null default 'other',   -- tense, article, preposition, word choice, ...
  source_feature    text not null,                   -- 'reader.retell', 'talk', 'grammar', ...
  review_count      integer not null default 0,
  correct_count     integer not null default 0,
  last_reviewed_at  timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists mistakes_user_created_idx on public.mistakes (user_id, created_at desc);

alter table public.mistakes enable row level security;

drop policy if exists "mistakes: read own" on public.mistakes;
create policy "mistakes: read own" on public.mistakes
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "mistakes: insert own" on public.mistakes;
create policy "mistakes: insert own" on public.mistakes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "mistakes: update own" on public.mistakes;
create policy "mistakes: update own" on public.mistakes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "mistakes: delete own" on public.mistakes;
create policy "mistakes: delete own" on public.mistakes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- daily_plan: today's story (+ a backup) and why it was chosen. One row per day.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_plan (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date            date not null,                    -- my local date
  story_book_id   uuid references public.books (id) on delete set null,
  backup_book_id  uuid references public.books (id) on delete set null,
  reason          text,
  completed       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_plan enable row level security;

drop policy if exists "daily_plan: read own" on public.daily_plan;
create policy "daily_plan: read own" on public.daily_plan
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "daily_plan: insert own" on public.daily_plan;
create policy "daily_plan: insert own" on public.daily_plan
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "daily_plan: update own" on public.daily_plan;
create policy "daily_plan: update own" on public.daily_plan
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
