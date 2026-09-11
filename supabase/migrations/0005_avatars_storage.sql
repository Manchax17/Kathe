-- 0005_avatars_storage.sql
-- Bucket público de avatares (2 MiB, solo imágenes).
--
-- La ruta de cada archivo es avatars/<uid>/<nombre>, así que la política de abajo
-- usa el primer segmento para que nadie pueda tocar la carpeta de otro.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública de las imágenes. El bucket es público, pero la tabla
-- storage.objects tiene RLS propio, así que la política es igualmente necesaria.
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Cada usuario gestiona únicamente lo que hay bajo avatars/<su_uid>/…
drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Users manage own avatar"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
