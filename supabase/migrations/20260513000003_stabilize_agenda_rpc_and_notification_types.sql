--
-- Estabilizacion estructural de agenda:
-- - agenda/usuarios/empresas son BIGINT en el schema base.
-- - agenda_notificaciones y upsert_agenda_reminders habian quedado en INTEGER.
-- - update_agenda_activity mantenia un nombre con historial de overloads y retorno void.
--
-- Esta migracion alinea tipos y expone update_agenda_activity_v2 con nombre unico.

alter table if exists public.agenda_notificaciones
  alter column agenda_id type bigint using agenda_id::bigint,
  alter column usuario_id type bigint using usuario_id::bigint,
  alter column empresa_id type bigint using empresa_id::bigint;

drop function if exists public.upsert_agenda_reminders(integer, date, text, integer, integer);

create or replace function public.upsert_agenda_reminders(
  p_agenda_id     bigint,
  p_event_date    date,
  p_time          text,
  p_minutes       integer,
  p_empresa_id    bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scheduled_at timestamptz;
  v_user_ids     bigint[];
begin
  update public.agenda_notificaciones
  set cancelled_at = now()
  where agenda_id = p_agenda_id
    and cancelled_at is null;

  if p_minutes is null then
    return;
  end if;

  v_scheduled_at := public.calc_reminder_scheduled_at(p_event_date, p_time, p_minutes);

  select array_agg(usuario_id)
  into v_user_ids
  from public.agenda_usuarios
  where agenda_id = p_agenda_id;

  if v_user_ids is null or array_length(v_user_ids, 1) = 0 then
    return;
  end if;

  insert into public.agenda_notificaciones (agenda_id, usuario_id, empresa_id, scheduled_at)
  select p_agenda_id, uid, p_empresa_id, v_scheduled_at
  from unnest(v_user_ids) as uid
  on conflict (agenda_id, usuario_id) do update
    set scheduled_at = excluded.scheduled_at,
        notified_at = null,
        cancelled_at = null,
        updated_at = now();
end;
$$;

create or replace function public.create_agenda_activity_v2(
  p_description       text,
  p_event_date        date,
  p_time              time without time zone,
  p_time_end          text            default null,
  p_priority          text            default 'media',
  p_tipo              text            default 'actividad',
  p_completed         boolean         default false,
  p_result            text            default null,
  p_assigned_user_ids bigint[]        default null,
  p_visibility        text            default 'private',
  p_reminder_minutes  integer         default null
)
returns public.agenda
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     bigint;
  v_empresa_id  bigint;
  v_equipo_id   bigint;
  v_assigned    bigint[];
  v_result      public.agenda;
begin
  select id, empresa_id, equipo_id
  into v_user_id, v_empresa_id, v_equipo_id
  from public.usuarios
  where auth_id = auth.uid()
    and estado = 'active'
  limit 1;

  if v_user_id is null then
    raise exception 'Usuario no encontrado o inactivo';
  end if;

  if p_description is null or trim(p_description) = '' then
    raise exception 'La descripcion es obligatoria';
  end if;

  if p_event_date is null then
    raise exception 'La fecha es obligatoria';
  end if;

  v_assigned := coalesce(p_assigned_user_ids, array[v_user_id]);
  if array_length(v_assigned, 1) is null or array_length(v_assigned, 1) = 0 then
    raise exception 'Debe asignarse al menos un usuario';
  end if;

  insert into public.agenda (
    description, event_date, time, time_end,
    priority, tipo, completed, result,
    user_id, owner_user_id, empresa_id, equipo_id,
    visibility, reminder_minutes_before
  )
  values (
    trim(p_description),
    p_event_date,
    p_time,
    nullif(trim(coalesce(p_time_end, '')), ''),
    coalesce(nullif(p_priority, ''), 'media'),
    coalesce(nullif(p_tipo, ''), 'actividad'),
    coalesce(p_completed, false),
    nullif(trim(coalesce(p_result, '')), ''),
    v_assigned[1],
    v_user_id,
    v_empresa_id,
    v_equipo_id,
    coalesce(nullif(p_visibility, ''), 'private'),
    p_reminder_minutes
  )
  returning * into v_result;

  insert into public.agenda_usuarios (agenda_id, usuario_id)
  select v_result.id, uid
  from unnest(v_assigned) as uid
  on conflict (agenda_id, usuario_id) do nothing;

  if p_reminder_minutes is not null then
    perform public.upsert_agenda_reminders(
      v_result.id,
      p_event_date,
      to_char(p_time, 'HH24:MI'),
      p_reminder_minutes,
      v_empresa_id
    );
  end if;

  return v_result;
end;
$$;

create or replace function public.update_agenda_activity_v2(
  p_agenda_id         bigint,
  p_description       text          default null,
  p_event_date        date          default null,
  p_time              time without time zone default null,
  p_time_end          text          default null,
  p_priority          text          default null,
  p_tipo              text          default null,
  p_completed         boolean       default null,
  p_result            text          default null,
  p_assigned_user_ids bigint[]      default null,
  p_reminder_minutes  integer       default -1
)
returns public.agenda
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing      public.agenda%rowtype;
  v_new_reminder  integer;
  v_updated       public.agenda;
begin
  select *
  into v_existing
  from public.agenda
  where id = p_agenda_id
    and archived_at is null;

  if not found then
    raise exception 'Actividad no encontrada';
  end if;

  if p_reminder_minutes = -1 then
    v_new_reminder := v_existing.reminder_minutes_before;
  else
    v_new_reminder := p_reminder_minutes;
  end if;

  update public.agenda
  set description = coalesce(nullif(trim(p_description), ''), v_existing.description),
      event_date = coalesce(p_event_date, v_existing.event_date),
      time = case when p_time is not null then p_time else v_existing.time end,
      time_end = case when p_time_end is not null then nullif(trim(p_time_end), '') else v_existing.time_end end,
      priority = coalesce(p_priority, v_existing.priority),
      tipo = coalesce(p_tipo, v_existing.tipo),
      completed = coalesce(p_completed, v_existing.completed),
      result = case when p_result is not null then nullif(trim(p_result), '') else v_existing.result end,
      reminder_minutes_before = v_new_reminder
  where id = p_agenda_id
  returning * into v_updated;

  if p_assigned_user_ids is not null and array_length(p_assigned_user_ids, 1) > 0 then
    update public.agenda
    set user_id = p_assigned_user_ids[1]
    where id = p_agenda_id
    returning * into v_updated;

    delete from public.agenda_usuarios
    where agenda_id = p_agenda_id
      and usuario_id <> all(p_assigned_user_ids);

    insert into public.agenda_usuarios (agenda_id, usuario_id)
    select p_agenda_id, uid
    from unnest(p_assigned_user_ids) as uid
    on conflict (agenda_id, usuario_id) do nothing;
  end if;

  perform public.upsert_agenda_reminders(
    p_agenda_id,
    coalesce(p_event_date, v_existing.event_date),
    coalesce(to_char(p_time, 'HH24:MI'), to_char(v_existing.time, 'HH24:MI')),
    v_new_reminder,
    v_existing.empresa_id
  );

  return v_updated;
end;
$$;

comment on function public.update_agenda_activity_v2 is
  'Actualiza actividad en agenda (v2, nombre unico, bigint y retorno agenda).';

notify pgrst, 'reload schema';
