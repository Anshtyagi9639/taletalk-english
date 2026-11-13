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
