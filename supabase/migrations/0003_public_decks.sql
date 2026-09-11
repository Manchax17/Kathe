-- 0003_public_decks.sql
-- Permite que un mazo sea visible para otras personas.
--
-- OJO: `fetchDecks()` en el frontend hace `select('*')` sin filtrar por user_id y
-- confiaba en que RLS lo limitara solo. Con esta política aditiva pasaría a traer
-- TAMBIÉN los mazos públicos de los demás. Hay que añadir `.eq('user_id', user.id)`
-- a esa query en el mismo cambio.

alter table public.decks
  add column if not exists is_public boolean not null default false;

create index if not exists decks_public_idx
  on public.decks (user_id)
  where is_public;

-- Política ADITIVA. En Postgres las políticas permisivas sobre la misma tabla se
-- combinan con OR, así que esta convive con "Users manage their own decks" en vez
-- de reemplazarla: el dueño sigue viendo y editando todo lo suyo, y el resto ve
-- únicamente las filas con is_public = true.
drop policy if exists "Public decks are visible to authenticated users" on public.decks;
create policy "Public decks are visible to authenticated users"
  on public.decks
  for select
  to authenticated
  using (is_public);
