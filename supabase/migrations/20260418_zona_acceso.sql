-- Control de acceso por zona para Responsables y Agentes
create table zona_acceso (
  id          bigserial primary key,
  zona_id     bigint not null references zona(id) on delete cascade,
  usuario_id  bigint not null references usuarios(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (zona_id, usuario_id)
);

-- RLS: solo admins/directores pueden gestionar; todos los autenticados pueden leer (para filtrar en servidor)
alter table zona_acceso enable row level security;

create policy "Authenticated can read zona_acceso"
on zona_acceso for select to authenticated using (true);

create policy "Admin/Director can insert zona_acceso"
on zona_acceso for insert to authenticated
with check (
  exists (
    select 1 from usuarios
    where auth_id = auth.uid() and rol in ('Administrador', 'Director')
  )
);

create policy "Admin/Director can delete zona_acceso"
on zona_acceso for delete to authenticated
using (
  exists (
    select 1 from usuarios
    where auth_id = auth.uid() and rol in ('Administrador', 'Director')
  )
);
