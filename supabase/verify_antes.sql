-- verify_antes.sql
-- Diagnóstico de SOLO LECTURA para correr ANTES de migrar.
--
-- No nombra ninguna tabla nueva en ninguna consulta: solo lee catálogos del sistema
-- (information_schema, pg_proc, pg_publication_tables, storage.buckets). Por eso no
-- puede fallar aunque `profiles`, `conversations` y `messages` no existan todavía.
--
-- Uso: pegar entero en el SQL Editor y dar Run. Salen 7 bloques.
-- Interpretación: todo lo que diga FALTA es lo que las migraciones van a crear.

-- 1. Tablas que deben existir después de migrar --------------------------------
select 'tabla'    as tipo,
       t.nombre   as nombre,
       case when to_regclass('public.' || t.nombre) is null
            then 'FALTA' else 'OK' end                   as estado,
       t.migracion                                       as lo_crea
from (
  values ('profiles',      '0002'),
         ('conversations', '0004'),
         ('messages',      '0004'),
         ('decks',         '0001')
) as t(nombre, migracion);

-- 2. Columna decks.is_public (la agrega 0003) ---------------------------------
select 'columna'          as tipo,
       'decks.is_public'  as nombre,
       case when exists (
              select 1 from information_schema.columns
               where table_schema = 'public'
                 and table_name   = 'decks'
                 and column_name  = 'is_public'
            ) then 'OK' else 'FALTA' end                 as estado,
       '0003'                                            as lo_crea;

-- 3. Bucket de avatares (lo crea 0005) ----------------------------------------
select 'bucket'   as tipo,
       'avatars'  as nombre,
       case when exists (select 1 from storage.buckets where id = 'avatars')
            then 'OK' else 'FALTA' end                   as estado,
       '0005'                                            as lo_crea;

-- 4. Realtime publicado para messages (lo hace 0004) --------------------------
select 'realtime'                  as tipo,
       'supabase_realtime.messages' as nombre,
       case when exists (
              select 1 from pg_publication_tables
               where pubname    = 'supabase_realtime'
                 and schemaname = 'public'
                 and tablename  = 'messages'
            ) then 'OK' else 'FALTA' end                 as estado,
       '0004'                                            as lo_crea;

-- 5. Funciones y RPCs (0002 y 0004) -------------------------------------------
select 'funcion'    as tipo,
       f.nombre     as nombre,
       case when exists (
              select 1
                from pg_proc p
                join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public'
                 and p.proname = f.nombre
            ) then 'OK' else 'FALTA' end                 as estado,
       f.migracion                                       as lo_crea
from (
  values ('create_profile_for',         '0002'),
         ('handle_new_user',            '0002'),
         ('touch_updated_at',           '0002'),
         ('get_or_create_conversation', '0004'),
         ('touch_conversation',         '0004')
) as f(nombre, migracion);

-- 6. Cuántas cuentas hay (el backfill de 0002 debe cubrirlas todas) ------------
select 'dato'                     as tipo,
       'usuarios en auth.users'   as nombre,
       count(*)::text             as estado,
       '(comparar despues)'       as lo_crea
from auth.users;

-- 7. Cuántos mazos hay (0003 no debe tocar este número) -----------------------
select 'dato'                     as tipo,
       'mazos en public.decks'    as nombre,
       (select count(*)::text from public.decks) as estado,
       '(no debe cambiar)'        as lo_crea;
