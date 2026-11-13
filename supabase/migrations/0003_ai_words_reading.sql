-- TaleTalk - Migration 0003: AI usage, saved words, practice log, reading progress function
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Run 0001 and 0002 first. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- ai_usage: one row per AI call. Used for rate limits and "AI usage this month".
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  feature        text not null,                  -- e.g. 'reader.word', 'talk', 'grammar'
  model          text,
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  audio_seconds  numeric(10, 2) not null default 0,
  characters     integer not null default 0,     -- text sent to text-to-speech
  cost_usd       numeric(12, 6) not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage: read own" on public.ai_usage;
create policy "ai_usage: read own" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "ai_usage: insert own" on public.ai_usage;
create policy "ai_usage: insert own" on public.ai_usage
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- saved_words: my word list (flashcards with spaced repetition: 1, 3, 7, 14, 30 days)
-- ---------------------------------------------------------------------------
create table if not exists public.saved_words (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word              text not null,
  meaning           text not null,
  example           text,
  phonetic          text,                         -- simple sound guide, e.g. KUMF-ter-bul
  hindi             text,
  sentence          text,                         -- the sentence where I found the word
  source_book_id    uuid references public.books (id) on delete set null,
  next_review_date  date not null default (current_date + 1),
  interval_days     integer not null default 1,
  review_count      integer not null default 0,
  created_at        timestamptz not null default now()
);

-- One card per word (not case sensitive).
create unique index if not exists saved_words_user_word_idx on public.saved_words (user_id, lower(word));
create index if not exists saved_words_review_idx on public.saved_words (user_id, next_review_date);

alter table public.saved_words enable row level security;

drop policy if exists "saved_words: read own" on public.saved_words;
create policy "saved_words: read own" on public.saved_words
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "saved_words: insert own" on public.saved_words;
create policy "saved_words: insert own" on public.saved_words
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "saved_words: update own" on public.saved_words;
create policy "saved_words: update own" on public.saved_words
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "saved_words: delete own" on public.saved_words;
create policy "saved_words: delete own" on public.saved_words
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- practice_log: minutes per feature per day (streak + stats)
-- ---------------------------------------------------------------------------
create table if not exists public.practice_log (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  feature  text not null,                         -- 'reading', 'talk', 'speak', ...
  date     date not null,                         -- my local date
  minutes  integer not null default 0 check (minutes >= 0),
  unique (user_id, feature, date)
);

alter table public.practice_log enable row level security;

drop policy if exists "practice_log: read own" on public.practice_log;
create policy "practice_log: read own" on public.practice_log
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "practice_log: insert own" on public.practice_log;
create policy "practice_log: insert own" on public.practice_log
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "practice_log: update own" on public.practice_log;
create policy "practice_log: update own" on public.practice_log
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Adds minutes to today's practice log (creates the row if needed).
create or replace function public.add_practice_minutes(p_feature text, p_date date, p_minutes integer)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.practice_log (user_id, feature, date, minutes)
  values ((select auth.uid()), p_feature, p_date, greatest(p_minutes, 0))
  on conflict (user_id, feature, date)
  do update set minutes = public.practice_log.minutes + excluded.minutes;
$$;

-- ---------------------------------------------------------------------------
-- save_reading_progress: one call from the Reader saves position + reading time.
-- A finished book stays "finished"; otherwise opening it makes it "reading".
-- Runs as the user (security invoker), so Row Level Security still applies.
-- ---------------------------------------------------------------------------
create or replace function public.save_reading_progress(
  p_book_id    uuid,
  p_chapter_id uuid,
  p_position   integer,
  p_percent    numeric,
  p_finished   boolean,
  p_minutes    integer,
  p_date       date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.reading_progress (user_id, book_id, chapter_id, position, percent, status, minutes)
  values (
    (select auth.uid()), p_book_id, p_chapter_id, greatest(p_position, 0),
    least(greatest(p_percent, 0), 100),
    case when p_finished then 'finished' else 'reading' end,
    greatest(p_minutes, 0)
  )
  on conflict (user_id, book_id) do update set
    chapter_id = excluded.chapter_id,
    position   = excluded.position,
    percent    = case when p_finished then 100 else excluded.percent end,
    status     = case
                   when p_finished or public.reading_progress.status = 'finished' then 'finished'
                   else 'reading'
                 end,
    minutes    = public.reading_progress.minutes + excluded.minutes;

  if p_minutes > 0 then
    perform public.add_practice_minutes('reading', p_date, p_minutes);
  end if;
end;
$$;
