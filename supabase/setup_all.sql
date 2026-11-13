-- TaleTalk - ALL database setup after 0001 (= migrations 0002 to 0009 in one file).
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste ALL of this -> Run.
-- Safe to run more than once. Needs 0001_profiles.sql first (already done).


-- ========================================================================
-- migrations/0002_library.sql
-- ========================================================================
-- TaleTalk - Migration 0002: Library (books, chapters, reading progress)
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Run 0001_profiles.sql first. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- books: one row per book or story in my library
-- ---------------------------------------------------------------------------
create table if not exists public.books (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title            text not null,
  author           text,
  cover_url        text,
  source           text not null check (source in ('gutenberg', 'upload', 'ai', 'info_only')),
  level            text check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  genre            text,
  is_public_domain boolean not null default false,
  gutenberg_id     integer,                     -- Project Gutenberg book number
  file_path        text,                        -- Supabase Storage path (uploads, Phase 5)
  summary          text,
  word_count       integer not null default 0,
  chapter_count    integer not null default 0,
  created_at       timestamptz not null default now()
);

-- The same Gutenberg book can be added only once per user.
create unique index if not exists books_user_gutenberg_idx
  on public.books (user_id, gutenberg_id) where gutenberg_id is not null;
create index if not exists books_user_created_idx on public.books (user_id, created_at desc);

alter table public.books enable row level security;

drop policy if exists "books: read own" on public.books;
create policy "books: read own" on public.books
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "books: insert own" on public.books;
create policy "books: insert own" on public.books
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "books: update own" on public.books;
create policy "books: update own" on public.books
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "books: delete own" on public.books;
create policy "books: delete own" on public.books
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- chapters: the text of each book, split into chapters / stories / parts.
-- Owner is checked through the book (chapters have no user_id of their own).
-- ---------------------------------------------------------------------------
create table if not exists public.chapters (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books (id) on delete cascade,
  number      integer not null,                -- 1, 2, 3 ... (reading order)
  title       text not null,
  content     text not null,                   -- paragraphs separated by a blank line
  word_count  integer not null default 0,
  summary     text,                            -- cached AI summary (Phase 3/7)
  questions   jsonb,                           -- cached AI questions (Phase 3/7)
  -- Full-text search over the chapter (title counts more than the text).
  search      tsvector generated always as (
                setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('english', left(content, 500000)), 'B')
              ) stored,
  created_at  timestamptz not null default now(),
  unique (book_id, number)
);

create index if not exists chapters_search_idx on public.chapters using gin (search);

alter table public.chapters enable row level security;

drop policy if exists "chapters: read own" on public.chapters;
create policy "chapters: read own" on public.chapters
  for select to authenticated using (
    exists (select 1 from public.books b where b.id = book_id and b.user_id = (select auth.uid()))
  );

drop policy if exists "chapters: insert own" on public.chapters;
create policy "chapters: insert own" on public.chapters
  for insert to authenticated with check (
    exists (select 1 from public.books b where b.id = book_id and b.user_id = (select auth.uid()))
  );

drop policy if exists "chapters: update own" on public.chapters;
create policy "chapters: update own" on public.chapters
  for update to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.user_id = (select auth.uid())))
  with check (exists (select 1 from public.books b where b.id = book_id and b.user_id = (select auth.uid())));

drop policy if exists "chapters: delete own" on public.chapters;
create policy "chapters: delete own" on public.chapters
  for delete to authenticated using (
    exists (select 1 from public.books b where b.id = book_id and b.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- reading_progress: one row per book. Status drives the Library tabs.
-- ---------------------------------------------------------------------------
create table if not exists public.reading_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book_id     uuid not null references public.books (id) on delete cascade,
  chapter_id  uuid references public.chapters (id) on delete set null,
  position    integer not null default 0,          -- paragraph index inside the chapter
  percent     numeric(5, 2) not null default 0 check (percent between 0 and 100),
  status      text not null default 'want' check (status in ('want', 'reading', 'finished')),
  minutes     integer not null default 0,
  updated_at  timestamptz not null default now(),
  unique (user_id, book_id)
);

alter table public.reading_progress enable row level security;

drop policy if exists "progress: read own" on public.reading_progress;
create policy "progress: read own" on public.reading_progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "progress: insert own" on public.reading_progress;
create policy "progress: insert own" on public.reading_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "progress: update own" on public.reading_progress;
create policy "progress: update own" on public.reading_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "progress: delete own" on public.reading_progress;
create policy "progress: delete own" on public.reading_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Keep updated_at fresh (function made in 0001_profiles.sql).
drop trigger if exists reading_progress_set_updated_at on public.reading_progress;
create trigger reading_progress_set_updated_at
  before update on public.reading_progress
  for each row execute function public.set_updated_at();

-- ========================================================================
-- migrations/0003_ai_words_reading.sql
-- ========================================================================
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

-- ========================================================================
-- migrations/0004_audio.sql
-- ========================================================================
-- TaleTalk - Migration 0004: Listen (audio cache + private "audio" storage bucket)
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Run 0001-0003 first. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- audio_cache: one mp3 per sentence per voice, so we never pay twice.
-- Owner is checked through chapter -> book (like chapters).
-- ---------------------------------------------------------------------------
create table if not exists public.audio_cache (
  id               uuid primary key default gen_random_uuid(),
  chapter_id       uuid not null references public.chapters (id) on delete cascade,
  paragraph_index  integer not null,
  sentence_index   integer not null,
  voice            text not null,
  file_path        text not null,          -- path inside the "audio" bucket
  created_at       timestamptz not null default now(),
  unique (chapter_id, paragraph_index, sentence_index, voice)
);

alter table public.audio_cache enable row level security;

drop policy if exists "audio_cache: read own" on public.audio_cache;
create policy "audio_cache: read own" on public.audio_cache
  for select to authenticated using (
    exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = chapter_id and b.user_id = (select auth.uid())
    )
  );

drop policy if exists "audio_cache: insert own" on public.audio_cache;
create policy "audio_cache: insert own" on public.audio_cache
  for insert to authenticated with check (
    exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = chapter_id and b.user_id = (select auth.uid())
    )
  );

drop policy if exists "audio_cache: delete own" on public.audio_cache;
create policy "audio_cache: delete own" on public.audio_cache
  for delete to authenticated using (
    exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = chapter_id and b.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Private storage bucket "audio" (max 5 MB per file, mp3 only).
-- Files live in a folder named after the user id: <user_id>/<book_id>/<chapter_id>/<voice>/<p>-<s>.mp3
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 5242880, array['audio/mpeg'])
on conflict (id) do nothing;

drop policy if exists "audio files: read own" on storage.objects;
create policy "audio files: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "audio files: add own" on storage.objects;
create policy "audio files: add own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "audio files: change own" on storage.objects;
create policy "audio files: change own" on storage.objects
  for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "audio files: delete own" on storage.objects;
create policy "audio files: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ========================================================================
-- migrations/0005_book_uploads.sql
-- ========================================================================
-- TaleTalk - Migration 0005: private Storage bucket "books" for my uploaded files
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Safe to run more than once.

-- Max 50 MB per file (the Supabase free plan limit). PDF, EPUB, DOCX and TXT only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'books', 'books', false, 52428800,
  array[
    'application/pdf',
    'application/epub+zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files live in a folder named after the user id: <user_id>/<random id>.<ext>
drop policy if exists "book files: read own" on storage.objects;
create policy "book files: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "book files: add own" on storage.objects;
create policy "book files: add own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'books' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "book files: delete own" on storage.objects;
create policy "book files: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ========================================================================
-- migrations/0006_book_info.sql
-- ========================================================================
-- TaleTalk - Migration 0006: extra book info for "info only" books (still under copyright)
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Safe to run more than once.

alter table public.books add column if not exists external_url text;      -- e.g. the Open Library page
alter table public.books add column if not exists published_year integer;
alter table public.books add column if not exists level_reason text;      -- one line: why this level

-- ========================================================================
-- migrations/0007_stories_today.sql
-- ========================================================================
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

-- ========================================================================
-- migrations/0008_talk.sql
-- ========================================================================
-- TaleTalk - Migration 0008: Talk (conversations with Alex) + saved phrases
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- conversations: one chat with Alex. messages = [{ role, text, correction?, at }]
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null default 'topic' check (kind in ('topic', 'roleplay')),
  topic       text not null,                     -- topic id / role-play id / free text (daily topic)
  title       text not null,                     -- shown in the list, e.g. "Ordering food"
  messages    jsonb not null default '[]'::jsonb,
  summary     jsonb,                             -- end-of-chat summary (top mistakes, phrases)
  ended       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx on public.conversations (user_id, updated_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conversations: read own" on public.conversations;
create policy "conversations: read own" on public.conversations
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "conversations: insert own" on public.conversations;
create policy "conversations: insert own" on public.conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "conversations: update own" on public.conversations;
create policy "conversations: update own" on public.conversations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "conversations: delete own" on public.conversations;
create policy "conversations: delete own" on public.conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- saved_phrases: useful phrases (from Talk summaries now, Practice later)
-- ---------------------------------------------------------------------------
create table if not exists public.saved_phrases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  situation   text not null,                     -- e.g. "Ordering food"
  phrase      text not null,
  usage_note  text,
  created_at  timestamptz not null default now()
);

create unique index if not exists saved_phrases_user_phrase_idx on public.saved_phrases (user_id, lower(phrase));

alter table public.saved_phrases enable row level security;

drop policy if exists "saved_phrases: read own" on public.saved_phrases;
create policy "saved_phrases: read own" on public.saved_phrases
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "saved_phrases: insert own" on public.saved_phrases;
create policy "saved_phrases: insert own" on public.saved_phrases
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "saved_phrases: delete own" on public.saved_phrases;
create policy "saved_phrases: delete own" on public.saved_phrases
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ========================================================================
-- migrations/0009_interview.sql
-- ========================================================================
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
