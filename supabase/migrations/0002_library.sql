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
