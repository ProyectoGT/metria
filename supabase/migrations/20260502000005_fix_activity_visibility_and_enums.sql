-- Corrige el origen del error "value too long for type character varying(5)"
-- en creacion de actividades: public.agenda.visibility puede existir como
-- varchar(5) en bases antiguas y recibe el valor interno "private" (7 chars).
-- Tambien normaliza prioridad/tipo a codigos internos y valida en las RPC.

drop policy if exists agenda_usuarios_select_scoped on public.agenda_usuarios;
drop policy if exists tarea_usuarios_select_scoped on public.tarea_usuarios;
drop policy if exists agenda_select_scoped on public.agenda;
drop policy if exists tareas_select_scoped on public.tareas;
drop policy if exists pedidos_select_scoped on public.pedidos;
drop policy if exists propiedades_select_scoped on public.propiedades;
drop trigger if exists trg_tareas_desarrollo_activity on public.tareas;

alter table public.agenda
  alter column priority type varchar(25),
  alter column tipo type varchar(25),
  alter column visibility type varchar(25),
  alter column gcal_event_id type varchar(255);

alter table public.tareas
  alter column prioridad type varchar(25),
  alter column estado type varchar(25),
  alter column visibility type varchar(25);

alter table public.pedidos
  alter column visibility type varchar(25);

alter table public.propiedades
  alter column visibility type varchar(25);

update public.agenda
set priority = case lower(btrim(coalesce(priority, 'media')))
    when 'alta' then 'alta'
    when 'high' then 'alta'
    when 'media' then 'media'
    when 'medium' then 'media'
    when 'baja' then 'baja'
    when 'low' then 'baja'
    else 'media'
  end,
  tipo = case lower(btrim(coalesce(tipo, 'actividad')))
    when 'visita' then 'visita'
    when 'visit' then 'visita'
    when 'llamada' then 'llamada'
    when 'call' then 'llamada'
    when 'reunion' then 'reunion'
    when 'meeting' then 'reunion'
    when 'seguimiento' then 'seguimiento'
    when 'follow_up' then 'seguimiento'
    when 'formacion' then 'formacion'
    when 'training' then 'formacion'
    when 'actividad' then 'actividad'
    when 'activity' then 'actividad'
    when 'otro' then 'otro'
    when 'other' then 'otro'
    else 'actividad'
  end,
  visibility = case lower(btrim(coalesce(visibility, 'private')))
    when 'team' then 'team'
    when 'company' then 'company'
    else 'private'
  end;

update public.tareas
set prioridad = case lower(btrim(coalesce(prioridad, 'media')))
    when 'alta' then 'alta'
    when 'high' then 'alta'
    when 'media' then 'media'
    when 'medium' then 'media'
    when 'baja' then 'baja'
    when 'low' then 'baja'
    else 'media'
  end,
  visibility = case lower(btrim(coalesce(visibility, 'private')))
    when 'team' then 'team'
    when 'company' then 'company'
    else 'private'
  end;

alter table public.agenda
  drop constraint if exists agenda_priority_check,
  drop constraint if exists agenda_tipo_check,
  drop constraint if exists agenda_visibility_check;

alter table public.agenda
  add constraint agenda_priority_check
  check (priority in ('alta', 'media', 'baja')),
  add constraint agenda_tipo_check
  check (tipo in ('visita', 'llamada', 'reunion', 'seguimiento', 'formacion', 'actividad', 'otro')),
  add constraint agenda_visibility_check
  check (visibility in ('private', 'team', 'company'));

alter table public.tareas
  drop constraint if exists tareas_prioridad_check,
  drop constraint if exists tareas_visibility_check;

alter table public.tareas
  add constraint tareas_prioridad_check
  check (prioridad is null or prioridad in ('alta', 'media', 'baja')),
  add constraint tareas_visibility_check
  check (visibility in ('private', 'team', 'company'));

alter table public.pedidos
  drop constraint if exists pedidos_visibility_check;

alter table public.pedidos
  add constraint pedidos_visibility_check
  check (visibility in ('private', 'team', 'company'));

alter table public.propiedades
  drop constraint if exists propiedades_visibility_check;

alter table public.propiedades
  add constraint propiedades_visibility_check
  check (visibility in ('private', 'team', 'company'));

create or replace function public.normalize_agenda_priority(raw_priority text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(btrim(coalesce(raw_priority, 'media')))
    when 'alta' then 'alta'
    when 'high' then 'alta'
    when 'media' then 'media'
    when 'medium' then 'media'
    when 'baja' then 'baja'
    when 'low' then 'baja'
    else null
  end
$$;

create or replace function public.normalize_agenda_tipo(raw_tipo text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(btrim(coalesce(raw_tipo, 'actividad')))
    when 'visita' then 'visita'
    when 'visit' then 'visita'
    when 'llamada' then 'llamada'
    when 'call' then 'llamada'
    when 'reunion' then 'reunion'
    when 'meeting' then 'reunion'
    when 'seguimiento' then 'seguimiento'
    when 'follow_up' then 'seguimiento'
    when 'formacion' then 'formacion'
    when 'training' then 'formacion'
    when 'actividad' then 'actividad'
    when 'activity' then 'actividad'
    when 'otro' then 'otro'
    when 'other' then 'otro'
    else null
  end
$$;

create or replace function public.normalize_visibility(raw_visibility text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(btrim(coalesce(raw_visibility, 'private')))
    when 'team' then 'team'
    when 'company' then 'company'
    when 'private' then 'private'
    else null
  end
$$;

create or replace function public.create_agenda_activity(
  p_description text,
  p_event_date date,
  p_time time,
  p_priority text default 'media',
  p_tipo text default 'actividad',
  p_result text default null,
  p_completed boolean default false,
  p_assigned_user_ids bigint[] default null,
  p_visibility text default 'private'
)
returns public.agenda
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id bigint := public.current_usuario_id();
  assigned_ids bigint[];
  first_assigned bigint;
  normalized_priority text := public.normalize_agenda_priority(p_priority);
  normalized_tipo text := public.normalize_agenda_tipo(p_tipo);
  normalized_visibility text := public.normalize_visibility(p_visibility);
  inserted public.agenda;
begin
  if current_id is null then
    raise exception 'No autenticado';
  end if;

  if p_description is null or btrim(p_description) = '' then
    raise exception 'La descripcion es obligatoria';
  end if;

  if p_event_date is null or p_time is null then
    raise exception 'La fecha y la hora son obligatorias';
  end if;

  if normalized_priority is null then
    raise exception 'Prioridad no valida: %', p_priority;
  end if;

  if normalized_tipo is null then
    raise exception 'Tipo de actividad no valido: %', p_tipo;
  end if;

  if normalized_visibility is null then
    raise exception 'Visibilidad no valida: %', p_visibility;
  end if;

  assigned_ids := public.normalize_assigned_user_ids(p_assigned_user_ids, current_id);
  first_assigned := assigned_ids[1];

  insert into public.agenda (
    description,
    event_date,
    time,
    priority,
    tipo,
    completed,
    result,
    user_id,
    owner_user_id,
    empresa_id,
    equipo_id,
    visibility
  )
  values (
    btrim(p_description),
    p_event_date,
    p_time,
    normalized_priority,
    normalized_tipo,
    coalesce(p_completed, false),
    nullif(btrim(coalesce(p_result, '')), ''),
    first_assigned,
    current_id,
    public.current_empresa_id(),
    public.current_equipo_id(),
    normalized_visibility
  )
  returning * into inserted;

  insert into public.agenda_usuarios (agenda_id, usuario_id)
  select inserted.id, user_id
  from unnest(assigned_ids) as user_id
  on conflict do nothing;

  return inserted;
end;
$$;

create or replace function public.update_agenda_activity(
  p_agenda_id bigint,
  p_description text,
  p_event_date date,
  p_time time,
  p_priority text default 'media',
  p_tipo text default 'actividad',
  p_result text default null,
  p_completed boolean default false,
  p_assigned_user_ids bigint[] default null
)
returns public.agenda
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id bigint := public.current_usuario_id();
  target public.agenda;
  assigned_ids bigint[];
  first_assigned bigint;
  normalized_priority text := public.normalize_agenda_priority(p_priority);
  normalized_tipo text := public.normalize_agenda_tipo(p_tipo);
  updated public.agenda;
begin
  if current_id is null then
    raise exception 'No autenticado';
  end if;

  if normalized_priority is null then
    raise exception 'Prioridad no valida: %', p_priority;
  end if;

  if normalized_tipo is null then
    raise exception 'Tipo de actividad no valido: %', p_tipo;
  end if;

  select *
  into target
  from public.agenda
  where id = p_agenda_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Actividad no encontrada';
  end if;

  if not (
    public.can_manage_scoped_row(target.owner_user_id, target.empresa_id)
    or public.is_agenda_assigned(target.id)
  ) then
    raise exception 'Sin permisos para editar la actividad';
  end if;

  assigned_ids := public.normalize_assigned_user_ids(p_assigned_user_ids, coalesce(target.user_id, target.owner_user_id, current_id));
  first_assigned := assigned_ids[1];

  update public.agenda
  set description = btrim(p_description),
      event_date = p_event_date,
      time = p_time,
      priority = normalized_priority,
      tipo = normalized_tipo,
      completed = coalesce(p_completed, false),
      result = nullif(btrim(coalesce(p_result, '')), ''),
      user_id = first_assigned
  where id = p_agenda_id
  returning * into updated;

  delete from public.agenda_usuarios
  where agenda_id = p_agenda_id
    and usuario_id <> all(assigned_ids);

  insert into public.agenda_usuarios (agenda_id, usuario_id)
  select p_agenda_id, user_id
  from unnest(assigned_ids) as user_id
  on conflict do nothing;

  return updated;
end;
$$;

create or replace function public.create_pending_tarea(
  p_titulo text,
  p_prioridad text default 'media',
  p_resultado text default null,
  p_completed boolean default false,
  p_assigned_user_ids bigint[] default null,
  p_visibility text default 'private'
)
returns public.tareas
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id bigint := public.current_usuario_id();
  assigned_ids bigint[];
  first_assigned bigint;
  normalized_priority text := public.normalize_agenda_priority(p_prioridad);
  normalized_visibility text := public.normalize_visibility(p_visibility);
  inserted public.tareas;
begin
  if current_id is null then
    raise exception 'No autenticado';
  end if;

  if p_titulo is null or btrim(p_titulo) = '' then
    raise exception 'El titulo es obligatorio';
  end if;

  if normalized_priority is null then
    raise exception 'Prioridad no valida: %', p_prioridad;
  end if;

  if normalized_visibility is null then
    raise exception 'Visibilidad no valida: %', p_visibility;
  end if;

  assigned_ids := public.normalize_assigned_user_ids(p_assigned_user_ids, current_id);
  first_assigned := assigned_ids[1];

  insert into public.tareas (
    titulo,
    prioridad,
    estado,
    fecha,
    agente_asignado,
    owner_user_id,
    empresa_id,
    equipo_id,
    visibility,
    resultado
  )
  values (
    btrim(p_titulo),
    normalized_priority,
    case when coalesce(p_completed, false) then 'completado' else 'pendiente' end,
    null,
    first_assigned,
    current_id,
    public.current_empresa_id(),
    public.current_equipo_id(),
    normalized_visibility,
    nullif(btrim(coalesce(p_resultado, '')), '')
  )
  returning * into inserted;

  insert into public.tarea_usuarios (tarea_id, usuario_id)
  select inserted.id, user_id
  from unnest(assigned_ids) as user_id
  on conflict do nothing;

  return inserted;
end;
$$;

create or replace function public.update_pending_tarea(
  p_tarea_id bigint,
  p_titulo text,
  p_prioridad text default 'media',
  p_resultado text default null,
  p_completed boolean default false,
  p_assigned_user_ids bigint[] default null
)
returns public.tareas
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id bigint := public.current_usuario_id();
  target public.tareas;
  assigned_ids bigint[];
  first_assigned bigint;
  normalized_priority text := public.normalize_agenda_priority(p_prioridad);
  updated public.tareas;
begin
  if current_id is null then
    raise exception 'No autenticado';
  end if;

  if normalized_priority is null then
    raise exception 'Prioridad no valida: %', p_prioridad;
  end if;

  select *
  into target
  from public.tareas
  where id = p_tarea_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Tarea no encontrada';
  end if;

  if not (
    public.can_manage_scoped_row(target.owner_user_id, target.empresa_id)
    or public.is_tarea_assigned(target.id)
  ) then
    raise exception 'Sin permisos para editar la tarea';
  end if;

  assigned_ids := public.normalize_assigned_user_ids(p_assigned_user_ids, coalesce(target.agente_asignado, target.owner_user_id, current_id));
  first_assigned := assigned_ids[1];

  update public.tareas
  set titulo = btrim(p_titulo),
      prioridad = normalized_priority,
      estado = case when coalesce(p_completed, false) then 'completado' else 'pendiente' end,
      fecha = null,
      agente_asignado = first_assigned,
      resultado = nullif(btrim(coalesce(p_resultado, '')), '')
  where id = p_tarea_id
  returning * into updated;

  delete from public.tarea_usuarios
  where tarea_id = p_tarea_id
    and usuario_id <> all(assigned_ids);

  insert into public.tarea_usuarios (tarea_id, usuario_id)
  select p_tarea_id, user_id
  from unnest(assigned_ids) as user_id
  on conflict do nothing;

  return updated;
end;
$$;

create trigger trg_tareas_desarrollo_activity
after update of estado on public.tareas
for each row
execute function public.track_tarea_desarrollo_activity();

create policy agenda_usuarios_select_scoped
on public.agenda_usuarios
for select
using (
  exists (
    select 1
    from public.agenda a
    where a.id = agenda_id
      and (
        public.can_access_scoped_row(a.owner_user_id, a.empresa_id, a.equipo_id, a.visibility)
        or usuario_id = public.current_usuario_id()
      )
  )
);

create policy tarea_usuarios_select_scoped
on public.tarea_usuarios
for select
using (
  exists (
    select 1
    from public.tareas t
    where t.id = tarea_id
      and (
        public.can_access_scoped_row(t.owner_user_id, t.empresa_id, t.equipo_id, t.visibility)
        or usuario_id = public.current_usuario_id()
      )
  )
);

create policy agenda_select_scoped
on public.agenda
for select
using (
  archived_at is null
  and (
    public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility)
    or public.is_agenda_assigned(id)
  )
);

create policy tareas_select_scoped
on public.tareas
for select
using (
  archived_at is null
  and (
    public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility)
    or public.is_tarea_assigned(id)
    or (
      auth.uid() is not null
      and public.current_user_role() = 'Responsable'
      and owner_user_id in (select public.get_supervised_user_ids())
      and empresa_id = public.current_empresa_id()
    )
  )
);

create policy pedidos_select_scoped
on public.pedidos
for select
using (public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility));

create policy propiedades_select_scoped
on public.propiedades
for select
using (public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility));

notify pgrst, 'reload schema';
