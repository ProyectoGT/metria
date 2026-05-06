create table if not exists public.propiedad_usuarios (
  id bigserial primary key,
  propiedad_id bigint not null references public.propiedades(id) on delete cascade,
  usuario_id bigint not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (propiedad_id, usuario_id)
);

insert into public.propiedad_usuarios (propiedad_id, usuario_id)
select id, agente_asignado
from public.propiedades
where agente_asignado is not null
on conflict do nothing;

create index if not exists idx_propiedad_usuarios_propiedad_id
  on public.propiedad_usuarios (propiedad_id);

create index if not exists idx_propiedad_usuarios_usuario_id
  on public.propiedad_usuarios (usuario_id);

alter table public.propiedad_usuarios enable row level security;

create or replace function public.can_access_propiedad(
  row_id bigint,
  row_owner_user_id bigint,
  row_empresa_id bigint,
  row_equipo_id bigint,
  row_visibility text,
  row_agente_asignado bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.can_access_scoped_row(row_owner_user_id, row_empresa_id, row_equipo_id, row_visibility) then true
    when row_agente_asignado = public.current_usuario_id() then true
    when exists (
      select 1
      from public.propiedad_usuarios pu
      where pu.propiedad_id = row_id
        and pu.usuario_id = public.current_usuario_id()
    ) then true
    else false
  end
$$;

create or replace function public.can_access_propiedad_by_id(row_propiedad_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.can_access_propiedad(
      p.id,
      p.owner_user_id,
      p.empresa_id,
      p.equipo_id,
      p.visibility,
      p.agente_asignado
    )
    from public.propiedades p
    where p.id = row_propiedad_id
  ), false)
$$;

drop policy if exists propiedad_usuarios_select_scoped on public.propiedad_usuarios;
create policy propiedad_usuarios_select_scoped
on public.propiedad_usuarios
for select
using (public.can_access_propiedad_by_id(propiedad_id));

drop policy if exists propiedades_select_scoped on public.propiedades;
create policy propiedades_select_scoped
on public.propiedades
for select
using (public.can_access_propiedad(id, owner_user_id, empresa_id, equipo_id, visibility, agente_asignado));

notify pgrst, 'reload schema';
