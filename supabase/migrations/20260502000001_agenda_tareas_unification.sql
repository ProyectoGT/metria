-- Unifica la base de datos para:
-- - agenda = actividades con fecha/hora
-- - tareas = pendientes sin fecha/hora
-- La migracion es aditiva y no elimina datos legacy.

alter table public.agenda
  add column if not exists archived_at timestamptz,
  add column if not exists archived_reason text,
  add column if not exists converted_to_tarea_id bigint;

alter table public.tareas
  add column if not exists archived_at timestamptz,
  add column if not exists archived_reason text,
  add column if not exists converted_to_agenda_id bigint;

alter table public.agenda
  drop constraint if exists agenda_converted_to_tarea_id_fkey;

alter table public.tareas
  drop constraint if exists tareas_converted_to_agenda_id_fkey;

alter table public.agenda
  add constraint agenda_converted_to_tarea_id_fkey
  foreign key (converted_to_tarea_id) references public.tareas (id) on delete set null;

alter table public.tareas
  add constraint tareas_converted_to_agenda_id_fkey
  foreign key (converted_to_agenda_id) references public.agenda (id) on delete set null;

create table if not exists public.agenda_usuarios (
  id bigserial primary key,
  agenda_id bigint not null references public.agenda (id) on delete cascade,
  usuario_id bigint not null references public.usuarios (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (agenda_id, usuario_id)
);

create table if not exists public.tarea_usuarios (
  id bigserial primary key,
  tarea_id bigint not null references public.tareas (id) on delete cascade,
  usuario_id bigint not null references public.usuarios (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tarea_id, usuario_id)
);

insert into public.agenda_usuarios (agenda_id, usuario_id)
select a.id, coalesce(a.user_id, a.owner_user_id)
from public.agenda a
where coalesce(a.user_id, a.owner_user_id) is not null
on conflict (agenda_id, usuario_id) do nothing;

insert into public.tarea_usuarios (tarea_id, usuario_id)
select t.id, coalesce(t.agente_asignado, t.owner_user_id)
from public.tareas t
where coalesce(t.agente_asignado, t.owner_user_id) is not null
on conflict (tarea_id, usuario_id) do nothing;

create index if not exists idx_agenda_event_date on public.agenda (event_date) where archived_at is null;
create index if not exists idx_agenda_completed on public.agenda (completed) where archived_at is null;
create index if not exists idx_agenda_gcal_event_id on public.agenda (gcal_event_id) where gcal_event_id is not null;
create index if not exists idx_agenda_archived_at on public.agenda (archived_at);
create index if not exists idx_tareas_estado on public.tareas (estado) where archived_at is null;
create index if not exists idx_tareas_archived_at on public.tareas (archived_at);
create index if not exists idx_agenda_usuarios_agenda_id on public.agenda_usuarios (agenda_id);
create index if not exists idx_agenda_usuarios_usuario_id on public.agenda_usuarios (usuario_id);
create index if not exists idx_tarea_usuarios_tarea_id on public.tarea_usuarios (tarea_id);
create index if not exists idx_tarea_usuarios_usuario_id on public.tarea_usuarios (usuario_id);

create or replace function public.current_user_can_use_usuario(target_usuario_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = target_usuario_id
      and u.empresa_id = public.current_empresa_id()
      and (
        public.current_user_role() in ('Administrador', 'Director')
        or u.id = public.current_usuario_id()
        or (
          public.current_user_role() = 'Responsable'
          and (
            u.id = public.current_usuario_id()
            or u.supervisor_id = public.current_usuario_id()
          )
        )
      )
  )
$$;

create or replace function public.is_agenda_assigned(target_agenda_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agenda_usuarios au
    where au.agenda_id = target_agenda_id
      and au.usuario_id = public.current_usuario_id()
  )
$$;

create or replace function public.is_tarea_assigned(target_tarea_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tarea_usuarios tu
    where tu.tarea_id = target_tarea_id
      and tu.usuario_id = public.current_usuario_id()
  )
$$;

create or replace function public.normalize_assigned_user_ids(candidate_ids bigint[], fallback_id bigint)
returns bigint[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized bigint[];
begin
  select array_agg(distinct user_id)
  into normalized
  from unnest(coalesce(candidate_ids, array[fallback_id])) as user_id
  where user_id is not null
    and public.current_user_can_use_usuario(user_id);

  if normalized is null or array_length(normalized, 1) is null then
    raise exception 'Debe asignarse al menos un usuario';
  end if;

  return normalized;
end;
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
  inserted public.tareas;
begin
  if current_id is null then
    raise exception 'No autenticado';
  end if;

  if p_titulo is null or btrim(p_titulo) = '' then
    raise exception 'El titulo es obligatorio';
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
    coalesce(nullif(p_prioridad, ''), 'media'),
    case when coalesce(p_completed, false) then 'completado' else 'pendiente' end,
    null,
    first_assigned,
    current_id,
    public.current_empresa_id(),
    public.current_equipo_id(),
    coalesce(nullif(p_visibility, ''), 'private'),
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
  updated public.tareas;
begin
  if current_id is null then
    raise exception 'No autenticado';
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
      prioridad = coalesce(nullif(p_prioridad, ''), 'media'),
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

create or replace function public.set_tarea_completed(
  p_tarea_id bigint,
  p_completed boolean,
  p_resultado text default null
)
returns public.tareas
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.tareas;
  updated public.tareas;
begin
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
    raise exception 'Sin permisos para completar la tarea';
  end if;

  update public.tareas
  set estado = case when coalesce(p_completed, false) then 'completado' else 'pendiente' end,
      resultado = case
        when coalesce(p_completed, false) then nullif(btrim(coalesce(p_resultado, target.resultado, '')), '')
        else null
      end
  where id = p_tarea_id
  returning * into updated;

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

create or replace function public.archive_tarea(
  p_tarea_id bigint,
  p_reason text default 'archived'
)
returns public.tareas
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.tareas;
  updated public.tareas;
begin
  select *
  into target
  from public.tareas
  where id = p_tarea_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Tarea no encontrada';
  end if;

  if not public.can_manage_scoped_row(target.owner_user_id, target.empresa_id) then
    raise exception 'Sin permisos para archivar la tarea';
  end if;

  update public.tareas
  set archived_at = now(),
      archived_reason = coalesce(nullif(p_reason, ''), 'archived')
  where id = p_tarea_id
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

create or replace function public.convert_tarea_to_agenda(
  p_tarea_id bigint,
  p_event_date date,
  p_time time,
  p_assigned_user_ids bigint[] default null
)
returns public.agenda
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id bigint := public.current_usuario_id();
  target public.tareas;
  assigned_ids bigint[];
  first_assigned bigint;
  inserted public.agenda;
begin
  if current_id is null then
    raise exception 'No autenticado';
  end if;

  if p_event_date is null or p_time is null then
    raise exception 'La fecha y la hora son obligatorias';
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
    raise exception 'Sin permisos para convertir la tarea';
  end if;

  if target.converted_to_agenda_id is not null then
    select *
    into inserted
    from public.agenda
    where id = target.converted_to_agenda_id;
    return inserted;
  end if;

  select array_agg(usuario_id)
  into assigned_ids
  from public.tarea_usuarios
  where tarea_id = target.id;

  assigned_ids := public.normalize_assigned_user_ids(coalesce(p_assigned_user_ids, assigned_ids), coalesce(target.agente_asignado, target.owner_user_id, current_id));
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
    target.titulo,
    p_event_date,
    p_time,
    coalesce(target.prioridad, 'media'),
    'actividad',
    target.estado in ('completado', 'completada'),
    target.resultado,
    first_assigned,
    coalesce(target.owner_user_id, current_id),
    target.empresa_id,
    target.equipo_id,
    target.visibility
  )
  returning * into inserted;

  insert into public.agenda_usuarios (agenda_id, usuario_id)
  select inserted.id, user_id
  from unnest(assigned_ids) as user_id
  on conflict do nothing;

  update public.tareas
  set archived_at = now(),
      archived_reason = 'converted_to_agenda',
      converted_to_agenda_id = inserted.id
  where id = target.id;

  return inserted;
end;
$$;

create or replace function public.convert_agenda_to_tarea(
  p_agenda_id bigint,
  p_assigned_user_ids bigint[] default null
)
returns public.tareas
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id bigint := public.current_usuario_id();
  target public.agenda;
  assigned_ids bigint[];
  first_assigned bigint;
  inserted public.tareas;
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
    raise exception 'Sin permisos para convertir la actividad';
  end if;

  if target.converted_to_tarea_id is not null then
    select *
    into inserted
    from public.tareas
    where id = target.converted_to_tarea_id;
    return inserted;
  end if;

  select array_agg(usuario_id)
  into assigned_ids
  from public.agenda_usuarios
  where agenda_id = target.id;

  assigned_ids := public.normalize_assigned_user_ids(coalesce(p_assigned_user_ids, assigned_ids), coalesce(target.user_id, target.owner_user_id, current_id));
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
    target.description,
    target.priority,
    case when target.completed then 'completado' else 'pendiente' end,
    null,
    first_assigned,
    coalesce(target.owner_user_id, current_id),
    target.empresa_id,
    target.equipo_id,
    target.visibility,
    target.result
  )
  returning * into inserted;

  insert into public.tarea_usuarios (tarea_id, usuario_id)
  select inserted.id, user_id
  from unnest(assigned_ids) as user_id
  on conflict do nothing;

  update public.agenda
  set archived_at = now(),
      archived_reason = 'converted_to_tarea',
      converted_to_tarea_id = inserted.id
  where id = target.id;

  return inserted;
end;
$$;

alter table public.agenda_usuarios enable row level security;
alter table public.tarea_usuarios enable row level security;

drop policy if exists agenda_usuarios_select_scoped on public.agenda_usuarios;
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

drop policy if exists tarea_usuarios_select_scoped on public.tarea_usuarios;
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

drop policy if exists agenda_select_scoped on public.agenda;
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

drop policy if exists tareas_select_scoped on public.tareas;
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

notify pgrst, 'reload schema';
