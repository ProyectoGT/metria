-- Optimizacion segura de lecturas frecuentes tras multi-asignacion de propiedades.
-- No cambia datos ni desactiva RLS.

-- Propiedades: dashboard, zona, mapas y detalle de finca.
create index if not exists idx_propiedades_empresa_estado_id
  on public.propiedades (empresa_id, estado, id desc);

create index if not exists idx_propiedades_finca_id
  on public.propiedades (finca_id);

create index if not exists idx_propiedades_agente_asignado
  on public.propiedades (agente_asignado);

create index if not exists idx_propiedades_owner_user_id
  on public.propiedades (owner_user_id);

create index if not exists idx_propiedades_empresa_id
  on public.propiedades (empresa_id);

create index if not exists idx_propiedades_visibility
  on public.propiedades (visibility);

-- Multi-asignacion: cubre filtros por usuario asignado y EXISTS de RLS.
create index if not exists idx_propiedad_usuarios_usuario_propiedad
  on public.propiedad_usuarios (usuario_id, propiedad_id);

-- Solicitudes: listados, scope granular y orden descendente.
create index if not exists idx_pedidos_empresa_id_desc
  on public.pedidos (empresa_id, id desc);

create index if not exists idx_pedidos_owner_user_id_desc
  on public.pedidos (owner_user_id, id desc);

create index if not exists idx_pedidos_visibility
  on public.pedidos (visibility);

create index if not exists idx_pedidos_visibility_agente_ids_gin
  on public.pedidos using gin (visibility_agente_ids);

-- Agenda: calendario, dashboard y orden del dia por empresa/fecha.
create index if not exists idx_agenda_empresa_event_date_active
  on public.agenda (empresa_id, event_date)
  where archived_at is null;

-- Version menos costosa para llamadas legacy desde funciones.
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

-- Policy directa con funciones current_* envueltas en SELECT para que Postgres
-- pueda tratarlas como initPlans en vez de recalcularlas por cada fila.
drop policy if exists propiedades_select_scoped on public.propiedades;
create policy propiedades_select_scoped
on public.propiedades
for select
using (
  auth.uid() is not null
  and (
    ((select public.current_user_role()) in ('Administrador', 'Director')
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

notify pgrst, 'reload schema';
