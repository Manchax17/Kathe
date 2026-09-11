-- 0004_chat.sql
-- Chat 1:1 en tiempo real.
--
-- Dos tablas en lugar de mensajes sueltos (sender/recipient): da una lista de
-- conversaciones directa y un único punto donde aplicar RLS.
--
-- El truco para no duplicar hilos: guardamos la pareja ordenada (user_low < user_high)
-- con un UNIQUE encima. Así es imposible que existan dos conversaciones entre las
-- mismas dos personas, sin depender de que el cliente ordene los UUID correctamente.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_ordered check (user_low < user_high),
  constraint conversations_pair_unique unique (user_low, user_high)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length
    check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists conversations_last_message_idx
  on public.conversations (last_message_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Solo los dos participantes ven la conversación.
drop policy if exists "Participants read own conversations" on public.conversations;
create policy "Participants read own conversations"
  on public.conversations
  for select
  to authenticated
  using (auth.uid() = user_low or auth.uid() = user_high);

-- Los mensajes se leen solo si pertenecen a una conversación propia.
drop policy if exists "Participants read messages" on public.messages;
create policy "Participants read messages"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_low = auth.uid() or c.user_high = auth.uid())
    )
  );

-- Y solo se pueden enviar a una conversación propia, con sender_id = quien llama
-- (si no, cualquiera podría escribir haciéndose pasar por el otro).
drop policy if exists "Participants send messages" on public.messages;
create policy "Participants send messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_low = auth.uid() or c.user_high = auth.uid())
    )
  );

-- No hay política de UPDATE ni DELETE: el historial es de solo-apendizaje.

-- `auto_expose_new_tables` está desactivado en config.toml.
-- conversations no recibe INSERT: las crea únicamente la RPC de abajo.
grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;


-- ───────── Abrir (o crear) una conversación ─────────
-- SECURITY DEFINER porque el cliente no tiene INSERT sobre conversations.
-- El bloque EXCEPTION cubre la carrera de dos usuarios abriendo el chat a la vez.

create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if p_other is null or p_other = v_uid then
    raise exception 'Destinatario inválido';
  end if;

  v_low := least(v_uid, p_other);
  v_high := greatest(v_uid, p_other);

  select id into v_id
  from public.conversations
  where user_low = v_low and user_high = v_high;

  if v_id is null then
    begin
      insert into public.conversations (user_low, user_high)
      values (v_low, v_high)
      returning id into v_id;
    exception when unique_violation then
      select id into v_id
      from public.conversations
      where user_low = v_low and user_high = v_high;
    end;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.get_or_create_conversation(uuid) from anon;
revoke execute on function public.get_or_create_conversation(uuid) from public;


-- ───────── Mantener last_message_at al día ─────────
-- SECURITY DEFINER para poder escribir en conversations saltándose RLS.

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

revoke execute on function public.touch_conversation() from anon;
revoke execute on function public.touch_conversation() from public;

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.touch_conversation();


-- ───────── Publicar en Realtime ─────────
-- Solo INSERTs: el chat es de solo-apendizaje. Los eventos llegan filtrados por RLS,
-- así que nadie recibe mensajes de conversaciones ajenas aunque se suscriba a ellas.
-- El `alter publication` falla si la tabla ya está publicada, de ahí el guard.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
