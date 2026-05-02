-- Índices de rendimiento para queries frecuentes.
-- Todos usan CREATE INDEX IF NOT EXISTS → seguros para re-aplicar.
-- No modifica datos, columnas ni políticas RLS.
-- Las columnas legacy (user_id, agente_asignado, fecha) se crean solo si existen.

-- ─── agenda ──────────────────────────────────────────────────────────────────

-- event_date ya existe desde 20260502000001; lo omitimos para no duplicar.
-- idx_agenda_event_date (event_date) WHERE archived_at IS NULL → ya existe.
-- idx_agenda_completed  (completed)  WHERE archived_at IS NULL → ya existe.
-- idx_agenda_gcal_event_id            WHERE gcal_event_id IS NOT NULL → ya existe.

-- Nuevo: owner_user_id (filtros de tareas propias del usuario)
create index if not exists idx_agenda_owner_user_id
  on public.agenda (owner_user_id)
  where archived_at is null;

-- Nuevo: empresa_id (filtros multi-tenant)
create index if not exists idx_agenda_empresa_id
  on public.agenda (empresa_id)
  where archived_at is null;

-- Nuevo: compuesto (event_date, owner_user_id) — cubre la query más frecuente:
-- "eventos del día X del usuario Y no archivados"
create index if not exists idx_agenda_event_date_owner
  on public.agenda (event_date, owner_user_id)
  where archived_at is null;

-- Nuevo: user_id legacy (solo si la columna existe)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'agenda'
      and column_name  = 'user_id'
  ) then
    execute $idx$
      create index if not exists idx_agenda_user_id
        on public.agenda (user_id)
        where archived_at is null
    $idx$;
  end if;
end;
$$;

-- ─── tareas ───────────────────────────────────────────────────────────────────

-- estado (pendiente/completado) — query más frecuente
create index if not exists idx_tareas_estado
  on public.tareas (estado)
  where archived_at is null;

-- Compuesto (estado, archived_at) — optimiza el filtro principal del dashboard
-- "estado = 'pendiente' AND archived_at IS NULL"
create index if not exists idx_tareas_estado_archived
  on public.tareas (estado, archived_at);

-- owner_user_id (tareas del usuario actual)
create index if not exists idx_tareas_owner_user_id
  on public.tareas (owner_user_id)
  where archived_at is null;

-- archived_at (soft-delete lookups)
create index if not exists idx_tareas_archived_at
  on public.tareas (archived_at)
  where archived_at is not null;

-- agente_asignado legacy (solo si existe)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'tareas'
      and column_name  = 'agente_asignado'
  ) then
    execute $idx$
      create index if not exists idx_tareas_agente_asignado
        on public.tareas (agente_asignado)
        where archived_at is null
    $idx$;
  end if;
end;
$$;

-- fecha (solo si existe — columna que ya no se usa en el flujo nuevo)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'tareas'
      and column_name  = 'fecha'
  ) then
    execute $idx$
      create index if not exists idx_tareas_fecha
        on public.tareas (fecha)
        where fecha is not null
    $idx$;
  end if;
end;
$$;

-- ─── tablas de unión (agenda_usuarios / tarea_usuarios) ──────────────────────
-- Cubren los JOINs en las queries de "eventos del usuario"

create index if not exists idx_agenda_usuarios_usuario_id
  on public.agenda_usuarios (usuario_id);

create index if not exists idx_agenda_usuarios_agenda_id
  on public.agenda_usuarios (agenda_id);

create index if not exists idx_tarea_usuarios_usuario_id
  on public.tarea_usuarios (usuario_id);

create index if not exists idx_tarea_usuarios_tarea_id
  on public.tarea_usuarios (tarea_id);
