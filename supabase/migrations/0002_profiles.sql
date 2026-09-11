-- 0002_profiles.sql
-- Perfiles públicos: la identidad social de Kathe.
--
-- Hoy `auth.users` no es consultable desde el cliente, así que sin esta tabla es
-- imposible buscar personas o mostrar quién es el dueño de un mazo.
-- Idempotente: se puede correr más de una vez sin romper nada.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 280)
);

create index if not exists profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

-- Cualquier persona autenticada puede ver perfiles: es lo que habilita la búsqueda.
-- No exponemos el email porque no vive en esta tabla.
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Cada quien crea y edita únicamente su propio perfil.
-- No hay política de DELETE: el perfil se borra en cascada con la cuenta.
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- `auto_expose_new_tables` está desactivado en config.toml, así que sin este GRANT
-- la tabla existe pero la Data API la rechaza en runtime.
grant select, insert, update on public.profiles to authenticated;


-- ───────── Alta automática de perfiles ─────────
-- Resuelve el username: prioriza el que eligió el usuario al registrarse, si no
-- deriva uno del email. Si ya está tomado, le añade _1, _2, … hasta encontrar hueco.

create or replace function public.create_profile_for(
  p_user_id uuid,
  p_email text,
  p_meta jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := coalesce(
    nullif(
      regexp_replace(lower(coalesce(p_meta ->> 'username', '')), '[^a-z0-9_]', '', 'g'),
      ''
    ),
    nullif(
      regexp_replace(lower(split_part(coalesce(p_email, ''), '@', 1)), '[^a-z0-9_]', '', 'g'),
      ''
    )
  );

  if base_username is null or length(base_username) < 3 then
    base_username := 'kathe';
  end if;
  base_username := substr(base_username, 1, 24);

  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := substr(base_username, 1, 18) || '_' || suffix;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    p_user_id,
    candidate,
    coalesce(nullif(p_meta ->> 'display_name', ''), candidate)
  )
  on conflict (id) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_profile_for(new.id, new.email, new.raw_user_meta_data);
  return new;
end;
$$;

-- SECURITY DEFINER corre como el dueño de la función, así que las revocamos para
-- que nadie las pueda invocar sin sesión.
revoke execute on function public.create_profile_for(uuid, text, jsonb) from anon;
revoke execute on function public.create_profile_for(uuid, text, jsonb) from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ───────── Backfill ─────────
-- Las cuentas creadas antes de esta migración no tienen perfil. Se lo creamos
-- recorriendo auth.users en orden de antigüedad, reutilizando la misma función.

do $$
declare
  u record;
begin
  for u in
    select id, email, raw_user_meta_data
    from auth.users
    where id not in (select id from public.profiles)
    order by created_at
  loop
    perform public.create_profile_for(u.id, u.email, u.raw_user_meta_data);
  end loop;
end $$;


-- ───────── updated_at ─────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();
