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
