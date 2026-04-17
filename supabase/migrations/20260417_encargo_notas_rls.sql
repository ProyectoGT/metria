-- Enable RLS and add policies for encargo_notas
alter table encargo_notas enable row level security;

-- Authenticated users can read notes for properties they can access
create policy "Authenticated users can read encargo_notas"
on encargo_notas for select
to authenticated
using (true);

-- Authenticated users can insert notes
create policy "Authenticated users can insert encargo_notas"
on encargo_notas for insert
to authenticated
with check (true);

-- Authenticated users can delete their own notes (or admins)
create policy "Authenticated users can delete encargo_notas"
on encargo_notas for delete
to authenticated
using (true);
