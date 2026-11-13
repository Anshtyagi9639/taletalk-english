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
