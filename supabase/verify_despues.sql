-- verify_despues.sql
-- Diagnóstico de SOLO LECTURA para correr DESPUÉS de las migraciones 0002 → 0005.
--
-- A diferencia de verify_antes.sql, este sí asume que las tablas existen.
-- Si una migración no llegó a correr, vas a ver un error tipo
--     relation "public.profiles" does not exist
--     column "is_public" does not exist
-- Ese error ES la respuesta: te está diciendo cuál migración falta. No se rompió
-- nada, el script es de solo lectura.
--
-- Si todo salió bien, los bloques 1–5 están en OK, y los bloques 6 y 7 en 0.

-- 1. Tablas --------------------------------------------------------------------
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

-- 2. Columna decks.is_public ---------------------------------------------------
select 'columna'          as tipo,
       'decks.is_public'  as nombre,
       case when exists (
              select 1 from information_schema.columns
               where table_schema = 'public'
                 and table_name   = 'decks'
                 and column_name  = 'is_public'
            ) then 'OK' else 'FALTA' end                 as estado,
       '0003'                                            as lo_crea;

-- 3. Bucket de avatares --------------------------------------------------------
select 'bucket'   as tipo,
       'avatars'  as nombre,
       case when exists (select 1 from storage.buckets where id = 'avatars')
            then 'OK' else 'FALTA' end                   as estado,
       '0005'                                            as lo_crea;

-- 4. Realtime ------------------------------------------------------------------
select 'realtime'                   as tipo,
       'supabase_realtime.messages' as nombre,
       case when exists (
              select 1 from pg_publication_tables
               where pubname    = 'supabase_realtime'
                 and schemaname = 'public'
                 and tablename  = 'messages'
            ) then 'OK' else 'FALTA' end                 as estado,
       '0004'                                            as lo_crea;

-- 5. Funciones y RPCs ----------------------------------------------------------
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

-- 6. Backfill: cuentas que quedaron sin perfil. DEBE SER 0 ---------------------
select 'backfill'                 as tipo,
       'auth.users sin perfil'    as nombre,
       (select count(*)::text
          from auth.users u
         where u.id not in (select id from public.profiles)) as estado,
       'debe ser 0'                                          as lo_crea;

-- 7. Mazos públicos. DEBE SER 0: nada se expone solo ---------------------------
select 'dato'                     as tipo,
       'mazos publicos'           as nombre,
       (select count(*)::text from public.decks where is_public) as estado,
       'debe ser 0'                                              as lo_crea;

-- 8. Políticas RLS activas ------------------------------------------------------
select 'politica'                     as tipo,
       schemaname || '.' || tablename as nombre,
       policyname                     as estado,
       cmd                            as lo_crea
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'conversations', 'messages', 'decks')
order by tablename, policyname;

-- 9. Los perfiles que creó el backfill -----------------------------------------
select username,
       display_name,
       avatar_url,
       created_at
from public.profiles
order by created_at;
