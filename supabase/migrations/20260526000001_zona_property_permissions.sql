-- Permisos de propiedades por zona:
-- read  -> ver propiedades dentro de la zona
-- write -> ver y editar/crear propiedades dentro de la zona
-- admin -> ver, editar/crear y borrar propiedades dentro de la zona

alter table public.zona_acceso
  add column if not exists permission_level text not null default 'read';

update public.zona_acceso
set permission_level = 'read'
where permission_level is null;

alter table public.zona_acceso
  drop constraint if exists zona_acceso_permission_level_check;

alter table public.zona_acceso
  add constraint zona_acceso_permission_level_check
  check (permission_level in ('read', 'write', 'admin'));

create index if not exists idx_zona_acceso_usuario_zona_permission
  on public.zona_acceso (usuario_id, zona_id, permission_level);

create or replace function public.zona_permission_rank(level text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case level
    when 'admin' then 3
    when 'write' then 2
    when 'read' then 1
    else 0
  end
$$;

create or replace function public.can_access_zona(
  row_zona_id bigint,
  min_level text default 'read'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      public.is_admin_role()
      or public.current_user_role() = 'Director'
      or exists (
        select 1
        from public.zona_acceso za
        where za.zona_id = row_zona_id
          and za.usuario_id = public.current_usuario_id()
          and public.zona_permission_rank(za.permission_level) >= public.zona_permission_rank(min_level)
      )
    )
$$;

create or replace function public.can_access_propiedad_via_zona(
  row_propiedad_id bigint,
  min_level text default 'read'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.can_access_zona(s.zona_id, min_level)
    from public.propiedades p
    join public.fincas f on f.id = p.finca_id
    join public.sectores s on s.id = f.sector_id
    where p.id = row_propiedad_id
  ), false)
$$;

-- Mantener compatibilidad con llamadas existentes a can_access_propiedad().
create or replace function public.can_access_propiedad(
  row_id bigint,
  row_owner_user_id bigint,
  row_empresa_id bigint,
  row_equipo_id bigint,
  row_visibility text,
  row_agente_asignado bigint
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_usuario_id bigint;
  v_rol text;
  v_empresa_id bigint;
  v_equipo_id bigint;
begin
  if auth.uid() is null then
    return false;
  end if;

  select u.id, u.rol, u.empresa_id, u.equipo_id
  into v_usuario_id, v_rol, v_empresa_id, v_equipo_id
  from public.usuarios u
  where u.auth_id = auth.uid()
  limit 1;

  if v_usuario_id is null then
    return false;
  end if;

  if public.can_access_propiedad_via_zona(row_id, 'read') then
    return true;
  end if;

  if v_rol in ('Administrador', 'Director')
     and row_empresa_id = v_empresa_id then
    return true;
  end if;

  if row_owner_user_id = v_usuario_id then
    return true;
  end if;

  if row_visibility = 'company'
     and row_empresa_id = v_empresa_id then
    return true;
  end if;

  if row_visibility = 'team'
     and row_empresa_id = v_empresa_id
     and row_equipo_id = v_equipo_id then
    return true;
  end if;

  if row_agente_asignado = v_usuario_id then
    return true;
  end if;

  return exists (
    select 1
    from public.propiedad_usuarios pu
    where pu.propiedad_id = row_id
      and pu.usuario_id = v_usuario_id
  );
end;
$$;

drop policy if exists propiedades_select_scoped on public.propiedades;
create policy propiedades_select_scoped
on public.propiedades
for select
using (
  auth.uid() is not null
  and (
    public.can_access_propiedad_via_zona(id, 'read')
    or ((select public.current_user_role()) in ('Administrador', 'Director')
      and empresa_id = (select public.current_empresa_id()))
    or owner_user_id = (select public.current_usuario_id())
    or (visibility = 'company'
      and empresa_id = (select public.current_empresa_id()))
    or (visibility = 'team'
      and empresa_id = (select public.current_empresa_id())
      and equipo_id = (select public.current_equipo_id()))
    or agente_asignado = (select public.current_usuario_id())
    or exists (
      select 1
      from public.propiedad_usuarios pu
      where pu.propiedad_id = id
        and pu.usuario_id = (select public.current_usuario_id())
    )
  )
);

drop policy if exists propiedades_update_scoped on public.propiedades;
create policy propiedades_update_scoped
on public.propiedades
for update
using (
  public.is_admin_role()
  or public.can_manage_scoped_row(owner_user_id, empresa_id)
  or public.can_access_propiedad_via_zona(id, 'write')
  or (
    auth.uid() is not null
    and empresa_id = public.current_empresa_id()
    and (
      agente_asignado = public.current_usuario_id()
      or public.current_user_role() = 'Director'
      or (
        public.current_user_role() = 'Responsable'
        and agente_asignado in (select public.get_supervised_user_ids())
      )
    )
  )
)
with check (
  public.is_admin_role()
  or public.can_access_propiedad_via_zona(id, 'write')
  or (
    empresa_id = public.current_empresa_id()
    and (
      owner_user_id = public.current_usuario_id()
      or agente_asignado = public.current_usuario_id()
      or public.current_user_role() in ('Director', 'Responsable')
    )
  )
);

drop policy if exists propiedades_insert_scoped on public.propiedades;
create policy propiedades_insert_scoped
on public.propiedades
for insert
with check (
  auth.uid() is not null
  and (
    public.is_admin_role()
    or (
      empresa_id = public.current_empresa_id()
      and owner_user_id = public.current_usuario_id()
      and (
        public.can_access_propiedad_via_zona(id, 'write')
        or exists (
          select 1
          from public.fincas f
          join public.sectores s on s.id = f.sector_id
          where f.id = finca_id
            and public.can_access_zona(s.zona_id, 'write')
        )
      )
    )
  )
);

drop policy if exists propiedades_delete_scoped on public.propiedades;
create policy propiedades_delete_scoped
on public.propiedades
for delete
using (
  public.is_admin_role()
  or public.can_manage_scoped_row(owner_user_id, empresa_id)
  or public.can_access_propiedad_via_zona(id, 'admin')
);

notify pgrst, 'reload schema';
