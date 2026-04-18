-- Bucket público para avatares de usuario
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Política: cualquier usuario autenticado puede subir/actualizar su propia carpeta
drop policy if exists "avatars_upload" on storage.objects;
create policy "avatars_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: lectura pública (el bucket es público, pero por si acaso)
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');
