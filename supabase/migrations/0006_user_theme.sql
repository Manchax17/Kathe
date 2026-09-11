-- 0006 · Personalización de apariencia por usuario (RF5)
--
-- Se guarda como JSONB y no como una columna por cada ajuste: el conjunto de
-- variables puede crecer (hoy son accent, scale, radius y grain) sin necesidad
-- de otra migración, y la app siempre lo lee entero para aplicarlo de una sola
-- vez como variables CSS.
--
-- No hacen falta políticas RLS nuevas: las de 0002 ya cubren toda la fila
-- (`Users update own profile` con auth.uid() = id), y los GRANT son a nivel de
-- tabla, así que alcanzan a las columnas nuevas.

-- Se llama `appearance` y no `theme` a propósito: "theme" ya significa
-- claro/oscuro en el resto de la app, y mezclar ambos conceptos confunde.

alter table public.profiles
  add column if not exists appearance jsonb not null default '{}'::jsonb;

comment on column public.profiles.appearance is
  'Personalización de apariencia del usuario. Formato: {"accent":"terracota","scale":"normal","radius":"cozy","grain":true}. Se aplica sobrescribiendo variables CSS en :root.';

-- Un usuario sin fila en profiles no tiene nada que personalizar, así que no
-- hace falta backfill: el default '{}' significa "usar el tema de Kathe".
