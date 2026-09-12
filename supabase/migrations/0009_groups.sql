-- 0009_groups.sql
--
-- RF4: mensajes directos y grupos. Los DM 1:1 ya están (migración 0004); esto
-- suma los grupos.
--
-- DECISIÓN DE DISEÑO: un grupo NO reusa `conversations`.
--
-- Es tentador generalizar `conversations` a N participantes, pero esa tabla
-- tiene un invariante que le da sentido: la pareja ordenada (user_low < user_high)
-- con un UNIQUE encima, que hace imposible que existan dos hilos entre las mismas
-- dos personas. Un grupo no tiene pareja: tiene un conjunto. Forzar la tabla
-- existente obligaría a relajar el CHECK y el UNIQUE —la única cosa que esa
-- migración se preocupaba por garantizar— y a llenar de nulos las columnas de
-- participantes.
--
-- En cambio la tabla `group_messages` SÍ espeja `messages`, columna por columna y
-- política por política. La duplicación es real pero acotada, y el front reusa el
-- mismo componente de hilo cambiando de dónde lee. La alternativa (una tabla
-- `conversations` polimórfica) haría que toda query de DM tuviera que discriminar
-- por tipo, sin ganar nada a cambio.
--
-- Idempotente: se puede correr más de una vez sin romper nada.

-- ─────────────────────────────── groups ───────────────────────────────
-- `created_by` es el administrador. Se guarda aparte de `group_members.role`
-- porque el admin no puede abandonar el grupo (ver la política de DELETE más
-- abajo): si se fuera, el grupo quedaría sin nadie que pueda expulsar gente.
-- Queda nulo si la cuenta se borra, y el grupo sobrevive con sus miembros.

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),

  constraint groups_name_length
    check (char_length(btrim(name)) between 1 and 60),
  constraint groups_description_length
    check (char_length(description) <= 280)
);

comment on table public.groups is
  'Grupos de chat (RF4). Privados: solo los ven sus miembros, no aparecen en perfiles ni en Explorar.';


-- ──────────────────────────── group_members ──────────────────────────
-- La membresía es la puerta de todo lo demás: cada política de `groups` y de
-- `group_messages` pregunta "¿auth.uid() está acá?".

create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member',
  joined_at timestamptz not null default now(),

  primary key (group_id, user_id),
  constraint group_members_role_valid check (role in ('admin', 'member'))
);

create index if not exists group_members_user_idx
  on public.group_members (user_id);

comment on table public.group_members is
  'Quiénes pertenecen a cada grupo. La PK (group_id, user_id) impide que alguien entre dos veces.';


-- ──────────────────────────── group_messages ─────────────────────────
-- Espeja `messages` de 0004: mismo tope de largo, mismos índices, misma lógica
-- de solo-apendizaje.

create table if not exists public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  constraint group_messages_body_length
    check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists group_messages_group_created_idx
  on public.group_messages (group_id, created_at);


-- ───────────────────────────────── RLS ───────────────────────────────

alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.group_messages enable row level security;


-- ── groups ──

-- Solo los miembros ven el grupo. No hay política para `anon`: un grupo ni
-- siquiera es visible sin sesión.
drop policy if exists "Members read own groups" on public.groups;
create policy "Members read own groups"
  on public.groups
  for select
  to authenticated
  using (public.is_group_member(id, auth.uid()));

-- Nace de la RPC create_group, no del cliente. Sin política de INSERT, el
-- cliente no puede insertar una fila "pelada" (sin membresía) ni inventar un
-- `created_by` ajeno. Ver la nota al final de la migración.

-- El admin puede renombrar y describir su grupo. El `with check` repite la
-- condición: sin él, alguien podría editar su grupo y de paso corromper la fila
-- para dejarla fuera de su propio alcance.
drop policy if exists "Admins update own groups" on public.groups;
create policy "Admins update own groups"
  on public.groups
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Solo el admin borra el grupo. Es el único borrado en cascada del esquema, y
-- es deliberado: sacar un grupo entero es del dueño, no de cualquiera.
drop policy if exists "Admins delete own groups" on public.groups;
create policy "Admins delete own groups"
  on public.groups
  for delete
  to authenticated
  using (created_by = auth.uid());


-- ── group_members ──
--
-- DOS TRAMPAS que costaron dos intentos, y valen para cualquier RLS con
-- membresía:
--
-- 1. RECURSIÓN DIRECTA (42P17). Una política sobre `group_members` que consulte
--    `group_members` se llama a sí misma y Postgres la corta con
--    «infinite recursion detected in policy for relation "group_members"».
--    No es un warning: la query falla entera. La salida es una función
--    SECURITY DEFINER (`is_group_member`), que corre como el dueño y por lo
--    tanto no vuelve a evaluar la política.
--
-- 2. RECURSIÓN INDIRECTA, mucho más traicionera. Aunque `is_group_member`
--    corta el bucle directo, la política de DELETE consultaba `groups`, y el
--    SELECT de `groups` llama a `is_group_member`... El detector de Postgres no
--    ve ese ciclo (atraviesa una función, no una vista), así que NO falla:
--    **pasa de más**. Se midió: con la versión anterior, borrar la propia
--    membresía de un grupo borraba las filas de TODOS los miembros, dejando el
--    grupo sin un solo participante. Un agujero silencioso, no un error.
--
-- Por eso la política de DELETE de acá abajo NO tiene subconsultas: solo la
-- comparación directa `user_id = auth.uid()`, que es lo único que hace falta
-- para irse de un grupo. La expulsión por parte del admin NO se hace con un
-- DELETE desde el cliente sino con la RPC `remove_group_member`, que valida el
-- rol en un único punto y no depende de cuántas políticas aniden.

create or replace function public.is_group_member(p_group uuid, p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members m
    where m.group_id = p_group
      and m.user_id = p_user
  );
$$;

comment on function public.is_group_member(uuid, uuid) is
  '¿Tal usuario pertenece a tal grupo? SECURITY DEFINER a proposito: una politica sobre group_members que consultara group_members directamente entraria en recursion infinita (42P17).';

revoke execute on function public.is_group_member(uuid, uuid) from anon;
revoke execute on function public.is_group_member(uuid, uuid) from public;


-- Veo la lista de miembros de los grupos a los que pertenezco (para el header
-- del hilo y para saber quién escribió cada mensaje).
drop policy if exists "Members read own group members" on public.group_members;
create policy "Members read own group members"
  on public.group_members
  for select
  to authenticated
  using (public.is_group_member(group_id, auth.uid()));

-- Agrego gente a un grupo del que soy miembro. Alcanza con ser miembro y no
-- admin: cualquier integrante puede sumar a alguien. Es intencionalmente
-- permisivo para un grupo de estudio, y el admin conserva la expulsión.
--
-- Ojo: esta política SÍ consulta `is_group_member`, y el INSERT la evalúa
-- contra la fila nueva. No hay bucle porque `group_messages`/`groups` no
-- vuelven a mirar `group_members` en sus propias políticas de escritura.
drop policy if exists "Members add members" on public.group_members;
create policy "Members add members"
  on public.group_members
  for insert
  to authenticated
  with check (public.is_group_member(group_id, auth.uid()));

-- Irse uno mismo. Sin subconsultas a propósito (ver la nota de arriba): la
-- expulsión de otro se hace por RPC, no por acá.
drop policy if exists "Members leave" on public.group_members;
create policy "Members leave"
  on public.group_members
  for delete
  to authenticated
  using (user_id = auth.uid());

-- No hay política de UPDATE: cambiar de rol no es una operación del cliente.
-- Hoy la membresía se crea o se borra, nada más.


-- ── group_messages ──

-- Leo los mensajes de un grupo del que soy miembro.
drop policy if exists "Members read group messages" on public.group_messages;
create policy "Members read group messages"
  on public.group_messages
  for select
  to authenticated
  using (public.is_group_member(group_id, auth.uid()));

-- Escribo solo si soy miembro y solo a mi nombre. La segunda condición no es
-- decorativa: sin ella cualquiera podría publicar en un grupo ajeno diciendo
-- que el mensaje es de otra persona.
drop policy if exists "Members send group messages" on public.group_messages;
create policy "Members send group messages"
  on public.group_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_group_member(group_id, auth.uid())
  );

-- Sin política de UPDATE ni DELETE: igual que el chat 1:1, el historial de un
-- grupo es de solo-apendizaje. Nadie edita ni borra lo que ya se dijo, ni el
-- admin. Si alguien se va del grupo, sus mensajes quedan (la FK es on delete
-- cascade sobre `groups`, no sobre `group_members`).


-- ─────────────────────────────── GRANTs ──────────────────────────────
-- `auto_expose_new_tables` está apagado en config.toml, así que sin esto la
-- tabla existe pero la Data API la rechaza en runtime.

grant select                    on public.groups         to authenticated;
grant select, insert, delete    on public.group_members  to authenticated;
grant select, insert            on public.group_messages to authenticated;


-- ─────────────────────── Crear un grupo (RPC) ────────────────────────
-- SECURITY DEFINER, igual que `get_or_create_conversation`: `groups` no tiene
-- política de INSERT, así que el grupo y la membresía del creador tienen que
-- nacer juntos y en una sola transacción. Hacerlo en dos inserts desde el
-- cliente dejaría una ventana con un grupo sin dueño, invisible para todos
-- (nadie es miembro, y sin membresía no hay SELECT).

create or replace function public.create_group(
  p_name    text,
  p_members uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_id   uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if char_length(v_name) < 1 then
    raise exception 'El grupo necesita un nombre';
  end if;

  if char_length(v_name) > 60 then
    raise exception 'El nombre no puede pasar de 60 caracteres';
  end if;

  insert into public.groups (name, created_by)
  values (v_name, v_uid)
  returning id into v_id;

  -- El creador entra como admin y con `on conflict do nothing` por si se pasó
  -- a sí mismo en p_members. El orden importa: esta fila tiene que existir
  -- antes que las demás, porque la política de INSERT de group_members exige
  -- que quien inserta ya sea miembro.
  insert into public.group_members (group_id, user_id, role)
  values (v_id, v_uid, 'admin')
  on conflict (group_id, user_id) do nothing;

  -- El resto de los invitados. `select distinct` y el filtro por nulos evitan
  -- que un array con repetidos o con null rompa el insert.
  insert into public.group_members (group_id, user_id, role)
  select v_id, u, 'member'
  from unnest(coalesce(p_members, '{}'::uuid[])) as u
  where u is not null and u <> v_uid
  group by u;

  return v_id;
end;
$$;

comment on function public.create_group(text, uuid[]) is
  'Crea un grupo y deja al que llama como admin, en una sola transacción. El grupo y su membresía tienen que nacer juntos: sin membresía el grupo no lo vería nadie.';

-- Como corre con permisos del dueño, la sacamos de los roles sin sesión.
revoke execute on function public.create_group(text, uuid[]) from anon;
revoke execute on function public.create_group(text, uuid[]) from public;


-- ─────────────────── Expulsar a alguien (RPC) ────────────────────────
-- El admin saca a otro miembro. Va por RPC y no por un DELETE del cliente
-- porque la política de DELETE de `group_members` tiene que quedarse sin
-- subconsultas (ver la nota de la sección anterior): validar "¿soy el admin de
-- este grupo?" dentro de una política que a su vez es consultada por la
-- política de `groups` desembocó en un borrado en cascada silencioso.
--
-- Acá la validación es explícita, en un solo lugar, y con mensajes claros.
-- Devuelve void y lanza excepción si no corresponde.

create or replace function public.remove_group_member(
  p_group uuid,
  p_user  uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- El admin no se expulsa a sí mismo por acá: para eso está "Salir del grupo",
  -- y así no se puede dejar un grupo sin nadie que lo administre.
  if p_user = v_uid then
    raise exception 'Para salir del grupo usá «Salir», no hace falta que te expulses';
  end if;

  if not exists (
    select 1 from public.groups g
    where g.id = p_group and g.created_by = v_uid
  ) then
    raise exception 'Solo el administrador puede quitar miembros';
  end if;

  delete from public.group_members
   where group_id = p_group and user_id = p_user;

  if not found then
    raise exception 'Esa persona no está en el grupo';
  end if;
end;
$$;

comment on function public.remove_group_member(uuid, uuid) is
  'El admin de un grupo quita a otro miembro. Por RPC porque la politica de DELETE de group_members no puede llevar subconsultas (provocaban un cascade silencioso).';

revoke execute on function public.remove_group_member(uuid, uuid) from anon;
revoke execute on function public.remove_group_member(uuid, uuid) from public;


-- ──────────────────────── Publicar en Realtime ───────────────────────
-- Misma mecánica que 0004: solo INSERTs (el chat es de solo-apendizaje), y los
-- eventos llegan filtrados por RLS, así que nadie recibe mensajes de grupos
-- ajenos aunque se suscriba a ellos. El `alter publication` falla si la tabla
-- ya está publicada, de ahí el guard.
--
-- Ojo al filtrar por Realtime: el payload NO trae las columnas del JOIN, así
-- que el cliente que quiera mostrar el nombre del autor tiene que resolverlo
-- contra el mapa de miembros que ya cargó.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_messages'
  ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end $$;
