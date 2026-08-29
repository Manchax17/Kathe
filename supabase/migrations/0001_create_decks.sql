-- 0001_create_decks.sql
-- Crea la tabla principal de Kathe con RLS.

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  words jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  study_order text not null default 'insertion'
    check (study_order in ('insertion', 'alphabetical', 'reverse', 'random', 'random_seed'))
);

alter table public.decks enable row level security;

drop policy if exists "Users manage their own decks" on public.decks;
create policy "Users manage their own decks"
  on public.decks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists decks_user_id_idx on public.decks(user_id);
create index if not exists decks_created_at_idx on public.decks(created_at desc);
