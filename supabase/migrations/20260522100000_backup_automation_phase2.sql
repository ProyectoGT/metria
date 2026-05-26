-- Fase 2: automatizaciones reales de backup
-- Añade columnas necesarias para scheduler, reintentos y estado de perfiles

alter table public.backup_profiles
  add column if not exists last_run_at timestamptz,
  add column if not exists next_run_at timestamptz,
  add column if not exists last_status text,
  add column if not exists max_retries integer not null default 2,
  add column if not exists retry_delay_minutes integer not null default 30;

comment on column public.backup_profiles.last_run_at is 'Ultima vez que se ejecuto este perfil';
comment on column public.backup_profiles.next_run_at is 'Proxima ejecucion programada (UTC)';
comment on column public.backup_profiles.last_status is 'Estado de la ultima ejecucion: running, verified, failed, config_error';
comment on column public.backup_profiles.max_retries is 'Numero maximo de reintentos automaticos';
comment on column public.backup_profiles.retry_delay_minutes is 'Minutos entre reintentos automaticos';

-- Indice para el scheduler: buscar perfiles vencidos eficientemente
create index if not exists idx_backup_profiles_next_run
  on public.backup_profiles (empresa_id, enabled, next_run_at)
  where enabled = true and next_run_at is not null;

-- Indice para verificar backups activos por perfil (evitar duplicados)
create index if not exists idx_backup_runs_profile_status
  on public.backup_runs (profile_id, status)
  where profile_id is not null;
