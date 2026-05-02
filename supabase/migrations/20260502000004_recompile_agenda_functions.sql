-- Fuerza la recompilacion de las funciones que usan public.agenda como tipo de retorno.
-- Esto es necesario cuando los tipos de columna de agenda cambian (varchar -> text):
-- PL/pgSQL cachea el plan compilado con los tipos antiguos. CREATE OR REPLACE
-- invalida ese cache y obliga a recompilar con el esquema actual.

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
    coalesce(nullif(p_priority, ''), 'media'),
    coalesce(nullif(p_tipo, ''), 'actividad'),
    coalesce(p_completed, false),
    nullif(btrim(coalesce(p_result, '')), ''),
    first_assigned,
    current_id,
    public.current_empresa_id(),
    public.current_equipo_id(),
    coalesce(nullif(p_visibility, ''), 'private')
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
  updated public.agenda;
begin
  if current_id is null then
    raise exception 'No autenticado';
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
      priority = coalesce(nullif(p_priority, ''), 'media'),
      tipo = coalesce(nullif(p_tipo, ''), 'actividad'),
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

create or replace function public.set_agenda_completed(
  p_agenda_id bigint,
  p_completed boolean,
  p_result text default null
)
returns public.agenda
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.agenda;
  updated public.agenda;
begin
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
    raise exception 'Sin permisos para completar la actividad';
  end if;

  update public.agenda
  set completed = coalesce(p_completed, false),
      result = case
        when coalesce(p_completed, false) then nullif(btrim(coalesce(p_result, target.result, '')), '')
        else null
      end
  where id = p_agenda_id
  returning * into updated;

  return updated;
end;
$$;

create or replace function public.archive_agenda(
  p_agenda_id bigint,
  p_reason text default 'archived'
)
returns public.agenda
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.agenda;
  updated public.agenda;
begin
  select *
  into target
  from public.agenda
  where id = p_agenda_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Actividad no encontrada';
  end if;

  if not public.can_manage_scoped_row(target.owner_user_id, target.empresa_id) then
    raise exception 'Sin permisos para archivar la actividad';
  end if;

  update public.agenda
  set archived_at = now(),
      archived_reason = coalesce(nullif(p_reason, ''), 'archived')
  where id = p_agenda_id
  returning * into updated;

  return updated;
end;
$$;

notify pgrst, 'reload schema';
