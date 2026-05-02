-- Add storage_path column to track uploaded files (for deletion)
alter table archivos add column if not exists storage_path text;

-- Create encargo-archivos bucket (public so URLs work without auth)
insert into storage.buckets (id, name, public)
values ('encargo-archivos', 'encargo-archivos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload/delete their files
create policy "Authenticated users can upload encargo files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'encargo-archivos');

create policy "Authenticated users can delete encargo files"
on storage.objects for delete
to authenticated
using (bucket_id = 'encargo-archivos');

create policy "Public read encargo files"
on storage.objects for select
to public
using (bucket_id = 'encargo-archivos');
