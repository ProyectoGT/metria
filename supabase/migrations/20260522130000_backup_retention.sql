-- Fase 6: retención y limpieza segura de backups

-- Columnas para bloqueo y expiración en backup_runs
alter table public.backup_runs
  add column if not exists locked_by    bigint references public.usuarios(id) on delete set null,
  add column if not exists expired_at   timestamptz,
  add column if not exists expired_by   bigint references public.usuarios(id) on delete set null,
  add column if not exists expiration_reason text;

-- Tabla de configuracion de retencion por empresa
create table if not exists public.backup_retention_config (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    bigint unique not null references public.empresas(id) on delete cascade,
  incrementals_days     integer not null default 30,
  daily_full_days       integer not null default 30,
  weekly_full_weeks     integer not null default 12,
  monthly_full_months   integer not null default 12,
  annual_full_years     integer not null default 7,
  keep_min_copies       integer not null default 3,
  updated_by    bigint references public.usuarios(id) on delete set null,
  updated_at    timestamptz not null default now()
);

-- RLS: solo admin puede gestionar retención
alter table public.backup_retention_config enable row level security;

create policy "retention_config_select" on public.backup_retention_config
  for select using (is_backup_operator(empresa_id));

create policy "retention_config_write" on public.backup_retention_config
  for all using (is_backup_admin(empresa_id));

-- Índice para encontrar backups expirados eficientemente
create index if not exists idx_backup_runs_expired
  on public.backup_runs(empresa_id, expired_at)
  where expired_at is not null;

-- Índice para encontrar backups bloqueados
create index if not exists idx_backup_runs_locked
  on public.backup_runs(empresa_id, locked_at)
  where locked_at is not null;
