-- 0007_deck_description.sql
--
-- RF1 pide "crear cards y decks con descripción por deck". Crear decks y fichas
-- ya funcionaba; lo único que faltaba era el campo.
--
-- Va con tope de largo porque no es un campo libre: se muestra recortado en la
-- tarjeta del mazo (2 líneas) y en el perfil público. Un texto sin límite
-- rompería el alto fijo de la tarjeta.

alter table public.decks
  add column if not exists description text not null default '';

-- El `drop ... if exists` va antes del `add` para que la migración se pueda
-- volver a correr sin fallar si la constraint ya está.
alter table public.decks
  drop constraint if exists decks_description_length;
alter table public.decks
  add constraint decks_description_length check (char_length(description) <= 280);

comment on column public.decks.description is
  'Descripción corta del mazo (máx. 280 caracteres). Se muestra recortada en la tarjeta y completa en el perfil público.';
