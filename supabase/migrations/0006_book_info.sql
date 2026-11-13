-- TaleTalk - Migration 0006: extra book info for "info only" books (still under copyright)
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Safe to run more than once.

alter table public.books add column if not exists external_url text;      -- e.g. the Open Library page
alter table public.books add column if not exists published_year integer;
alter table public.books add column if not exists level_reason text;      -- one line: why this level
