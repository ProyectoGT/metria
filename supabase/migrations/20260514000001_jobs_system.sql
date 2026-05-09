-- ─── Background Jobs System ──────────────────────────────────────────────────
--
-- Sistema de cola de trabajos asincronos para procesos pesados o diferidos:
--   - Envio de emails, notificaciones, exportaciones, sincronizaciones
--   - Generacion de reportes, limpieza de datos, recordatorios
--   - Auditoria diferida, tareas programadas
--
-- Estados: pending → processing → completed
--                                → failed (con retry si attempts < max_attempts)
--
-- Multi-tenant via empresa_id. RLS activo para consulta, workers usan
-- service_role para procesar.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Enum de estados ───────────────────────────────────────────────────────

do $$ begin
  create type job_status as enum ('pending', 'processing', 'completed', 'failed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

-- ── 2. Tabla jobs ────────────────────────────────────────────────────────────

create table if not exists public.jobs (
  id              uuid        primary key default gen_random_uuid(),
  empresa_id      bigint      references public.empresas(id) on delete set null,
  created_by      bigint      references public.usuarios(id) on delete set null,
  type            text        not null,
  payload         jsonb       not null default '{}',
  status          job_status  not null default 'pending',
  priority        integer     not null default 0,
  max_attempts    integer     not null default 3,
  attempts        integer     not null default 0,
  scheduled_for   timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  failed_at       timestamptz,
  cancelled_at    timestamptz,
  error_message   text,
  error_stack     text,
  result          jsonb,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

-- ── 3. Tabla job_logs ────────────────────────────────────────────────────────

create table if not exists public.job_logs (
  id          uuid        primary key default gen_random_uuid(),
  job_id      uuid        not null references public.jobs(id) on delete cascade,
  attempt     integer     not null default 1,
  level       text        not null default 'info',
  message     text        not null,
  metadata    jsonb,
  duration_ms integer,
  created_at  timestamptz not null default now()
);

-- ── 4. Tabla job_schedules (cron definitions) ───────────────────────────────

create table if not exists public.job_schedules (
  id                uuid        primary key default gen_random_uuid(),
  job_type          text        not null unique,
  cron_expression   text        not null,
  payload           jsonb       not null default '{}',
  description       text,
  enabled           boolean     not null default true,
  last_enqueued_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 5. Indices ───────────────────────────────────────────────────────────────

create index if not exists idx_jobs_status_priority
  on public.jobs(status, priority desc, created_at asc)
  where status = 'pending';

create index if not exists idx_jobs_scheduled
  on public.jobs(scheduled_for)
  where status = 'pending' and scheduled_for is not null;

create index if not exists idx_jobs_type_status
  on public.jobs(type, status);

create index if not exists idx_jobs_empresa
  on public.jobs(empresa_id, status);

create index if not exists idx_job_logs_job
  on public.job_logs(job_id, created_at asc);

-- ── 6. RLS ───────────────────────────────────────────────────────────────────

alter table public.jobs enable row level security;
alter table public.job_logs enable row level security;
alter table public.job_schedules enable row level security;

-- Jobs: usuarios ven jobs de su misma empresa
create policy "jobs_select_empresa"
  on public.jobs for select
  using (
    empresa_id is null
    or exists (
      select 1 from public.usuarios
      where auth_id = auth.uid()
        and (
          empresa_id = jobs.empresa_id
          or rol = 'Administrador'
        )
        and estado = 'active'
    )
  );

create policy "jobs_insert_own"
  on public.jobs for insert
  with check (true);  -- controlado via server action / API

create policy "jobs_update_own"
  on public.jobs for update
  using (
    exists (
      select 1 from public.usuarios
      where auth_id = auth.uid() and estado = 'active'
    )
  );

-- Job logs: acceso via empresa del job
create policy "job_logs_select"
  on public.job_logs for select
  using (
    exists (
      select 1 from public.jobs j
      join public.usuarios u on u.auth_id = auth.uid() and u.estado = 'active'
      where j.id = job_logs.job_id
        and (j.empresa_id is null or u.empresa_id = j.empresa_id or u.rol = 'Administrador')
    )
  );

create policy "job_logs_insert"
  on public.job_logs for insert
  with check (true);

-- Schedules: solo administradores
create policy "job_schedules_select"
  on public.job_schedules for select
  using (true);

create policy "job_schedules_admin"
  on public.job_schedules for insert
  with check (
    exists (
      select 1 from public.usuarios
      where auth_id = auth.uid() and rol = 'Administrador' and estado = 'active'
    )
  );

create policy "job_schedules_admin_update"
  on public.job_schedules for update
  using (
    exists (
      select 1 from public.usuarios
      where auth_id = auth.uid() and rol = 'Administrador' and estado = 'active'
    )
  );

create policy "job_schedules_admin_delete"
  on public.job_schedules for delete
  using (
    exists (
      select 1 from public.usuarios
      where auth_id = auth.uid() and rol = 'Administrador' and estado = 'active'
    )
  );

-- ── 7. Trigger updated_at ─────────────────────────────────────────────────────

create or replace function public.update_jobs_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row
  execute function public.update_jobs_updated_at();

create trigger trg_job_schedules_updated_at
  before update on public.job_schedules
  for each row
  execute function public.update_jobs_updated_at();

-- ── 8. Funcion: claim_next_job (atómico, evita doble-procesamiento) ──────────

create or replace function public.claim_next_job(p_worker_id text default null)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs;
begin
  update public.jobs
  set status = 'processing',
      attempts = attempts + 1,
      started_at = now(),
      updated_at = now()
  where id = (
    select id
    from public.jobs
    where status = 'pending'
      and (scheduled_for is null or scheduled_for <= now())
      and attempts < max_attempts
    order by priority desc, created_at asc
    limit 1
    for update skip locked
  )
  returning * into v_job;

  return v_job;
end;
$$;

comment on function public.claim_next_job is
  'Selecciona atomica de siguiente job pendiente. Usa FOR UPDATE SKIP LOCKED para evitar contención entre workers.';

notify pgrst, 'reload schema';
