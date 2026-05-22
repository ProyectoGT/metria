-- Backup Center: secure backup and restore control plane.
-- Phase 1 creates metadata, audit, integrity and restore request tables.

do $$ begin
  create type backup_type as enum ('full', 'incremental');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type backup_schedule_type as enum ('hourly', 'every_x_hours', 'daily', 'weekly', 'monthly', 'custom');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type backup_run_status as enum (
    'queued', 'running', 'exporting_database', 'exporting_storage',
    'compressing', 'encrypting', 'uploading', 'verifying', 'verified',
    'failed', 'expired', 'locked', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type backup_triggered_mode as enum ('manual', 'scheduled', 'retry', 'system');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type backup_artifact_type as enum (
    'database_dump', 'storage_object', 'manifest', 'checksum_file',
    'config_export', 'audit_export'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type backup_destination_type as enum (
    'supabase_storage', 's3', 'local_download', 'external_provider'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type backup_change_operation as enum (
    'created', 'updated', 'deleted', 'restored', 'file_uploaded',
    'file_deleted', 'permission_changed', 'setting_changed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type restore_run_status as enum (
    'requested', 'pending_approval', 'approved', 'rejected', 'dry_running',
    'ready', 'restoring', 'completed', 'failed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type restore_type as enum (
    'full', 'database', 'storage', 'module', 'record', 'test_environment', 'production'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type backup_integrity_status as enum ('pending', 'passed', 'failed', 'warning');
exception when duplicate_object then null;
end $$;

create table if not exists public.backup_destinations (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  name text not null,
  type backup_destination_type not null default 'supabase_storage',
  enabled boolean not null default true,
  config jsonb not null default '{}',
  is_primary boolean not null default false,
  created_by bigint references public.usuarios(id) on delete set null,
  updated_by bigint references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_profiles (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  name text not null,
  description text,
  enabled boolean not null default false,
  backup_type backup_type not null default 'full',
  schedule_type backup_schedule_type not null default 'daily',
  schedule_config jsonb not null default '{}',
  timezone text not null default 'Europe/Madrid',
  scope jsonb not null default '[]',
  destination_primary jsonb not null default '{"type":"supabase_storage"}',
  destination_secondary jsonb,
  retention_policy jsonb not null default '{}',
  notify_on_success boolean not null default false,
  notify_on_failure boolean not null default true,
  notify_admins boolean not null default true,
  notify_directors boolean not null default true,
  require_mfa boolean not null default true,
  require_second_approval boolean not null default true,
  created_by bigint references public.usuarios(id) on delete set null,
  updated_by bigint references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  profile_id uuid references public.backup_profiles(id) on delete set null,
  backup_type backup_type not null,
  status backup_run_status not null default 'queued',
  triggered_mode backup_triggered_mode not null default 'manual',
  triggered_by bigint references public.usuarios(id) on delete set null,
  scope jsonb not null default '[]',
  destination_primary jsonb not null default '{"type":"supabase_storage"}',
  destination_secondary jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  size_bytes bigint,
  manifest_path text,
  manifest jsonb,
  checksum text,
  parent_backup_id uuid references public.backup_runs(id) on delete restrict,
  error_message text,
  verified_at timestamptz,
  locked_at timestamptz,
  locked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_artifacts (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  backup_run_id uuid not null references public.backup_runs(id) on delete cascade,
  artifact_type backup_artifact_type not null,
  path text not null,
  bucket text,
  size_bytes bigint,
  checksum text,
  content_type text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.restore_runs (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  backup_run_id uuid not null references public.backup_runs(id) on delete restrict,
  status restore_run_status not null default 'requested',
  restore_type restore_type not null,
  target jsonb not null default '{}',
  requested_by bigint references public.usuarios(id) on delete set null,
  approved_by bigint references public.usuarios(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  dry_run_result jsonb,
  pre_restore_backup_id uuid references public.backup_runs(id) on delete restrict,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_audit_log (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  event_type text not null,
  backup_run_id uuid references public.backup_runs(id) on delete set null,
  profile_id uuid references public.backup_profiles(id) on delete set null,
  restore_run_id uuid references public.restore_runs(id) on delete set null,
  user_id bigint references public.usuarios(id) on delete set null,
  user_role text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_change_log (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  operation backup_change_operation not null,
  table_name text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  changed_by bigint references public.usuarios(id) on delete set null,
  changed_at timestamptz not null default now(),
  backup_run_id uuid references public.backup_runs(id) on delete set null,
  processed_at timestamptz,
  metadata jsonb
);

create table if not exists public.backup_integrity_checks (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  backup_run_id uuid not null references public.backup_runs(id) on delete cascade,
  check_type text not null,
  status backup_integrity_status not null default 'pending',
  expected_value text,
  actual_value text,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_maintenance (
  id uuid primary key default gen_random_uuid(),
  empresa_id bigint references public.empresas(id) on delete cascade,
  enabled boolean not null default false,
  reason text not null,
  started_by bigint references public.usuarios(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  metadata jsonb
);

create index if not exists idx_backup_profiles_empresa on public.backup_profiles(empresa_id, enabled);
create index if not exists idx_backup_runs_empresa_status on public.backup_runs(empresa_id, status, created_at desc);
create index if not exists idx_backup_runs_parent on public.backup_runs(parent_backup_id);
create index if not exists idx_backup_artifacts_run on public.backup_artifacts(backup_run_id);
create index if not exists idx_backup_audit_empresa on public.backup_audit_log(empresa_id, created_at desc);
create index if not exists idx_backup_change_pending on public.backup_change_log(empresa_id, processed_at, changed_at);
create index if not exists idx_restore_runs_empresa on public.restore_runs(empresa_id, status, created_at desc);
create index if not exists idx_backup_integrity_run on public.backup_integrity_checks(backup_run_id);

create or replace function public.update_backup_center_updated_at()
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

drop trigger if exists trg_backup_profiles_updated_at on public.backup_profiles;
create trigger trg_backup_profiles_updated_at
  before update on public.backup_profiles
  for each row execute function public.update_backup_center_updated_at();

drop trigger if exists trg_backup_runs_updated_at on public.backup_runs;
create trigger trg_backup_runs_updated_at
  before update on public.backup_runs
  for each row execute function public.update_backup_center_updated_at();

drop trigger if exists trg_backup_destinations_updated_at on public.backup_destinations;
create trigger trg_backup_destinations_updated_at
  before update on public.backup_destinations
  for each row execute function public.update_backup_center_updated_at();

drop trigger if exists trg_restore_runs_updated_at on public.restore_runs;
create trigger trg_restore_runs_updated_at
  before update on public.restore_runs
  for each row execute function public.update_backup_center_updated_at();

alter table public.backup_destinations enable row level security;
alter table public.backup_profiles enable row level security;
alter table public.backup_runs enable row level security;
alter table public.backup_artifacts enable row level security;
alter table public.backup_audit_log enable row level security;
alter table public.backup_change_log enable row level security;
alter table public.restore_runs enable row level security;
alter table public.backup_integrity_checks enable row level security;
alter table public.system_maintenance enable row level security;

-- Strict multi-tenant: empresa_id must match, no cross-tenant escape.
create or replace function public.is_backup_operator(p_empresa_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_id = auth.uid()
      and u.estado = 'active'
      and u.empresa_id = p_empresa_id
      and u.rol in ('Administrador', 'Director')
  );
$$;

create or replace function public.is_backup_admin(p_empresa_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_id = auth.uid()
      and u.estado = 'active'
      and u.empresa_id = p_empresa_id
      and u.rol = 'Administrador'
  );
$$;

create policy "backup_destinations_select" on public.backup_destinations
  for select using (public.is_backup_operator(empresa_id));
create policy "backup_profiles_select" on public.backup_profiles
  for select using (public.is_backup_operator(empresa_id));
create policy "backup_runs_select" on public.backup_runs
  for select using (public.is_backup_operator(empresa_id));
create policy "backup_artifacts_select" on public.backup_artifacts
  for select using (public.is_backup_operator(empresa_id));
create policy "backup_audit_log_select" on public.backup_audit_log
  for select using (public.is_backup_operator(empresa_id));
create policy "backup_change_log_select" on public.backup_change_log
  for select using (public.is_backup_operator(empresa_id));
create policy "restore_runs_select" on public.restore_runs
  for select using (public.is_backup_operator(empresa_id));
create policy "backup_integrity_checks_select" on public.backup_integrity_checks
  for select using (public.is_backup_operator(empresa_id));
create policy "system_maintenance_select" on public.system_maintenance
  for select using (public.is_backup_operator(empresa_id));

create policy "backup_destinations_write" on public.backup_destinations
  for all using (public.is_backup_admin(empresa_id))
  with check (public.is_backup_admin(empresa_id));
create policy "backup_profiles_write" on public.backup_profiles
  for all using (public.is_backup_admin(empresa_id))
  with check (public.is_backup_admin(empresa_id));
create policy "backup_runs_write" on public.backup_runs
  for all using (public.is_backup_admin(empresa_id))
  with check (public.is_backup_admin(empresa_id));
-- Artifacts and integrity checks: only service role via admin client writes these.
-- Restrict browser-client inserts to backup admins as defense-in-depth.
create policy "backup_artifacts_insert" on public.backup_artifacts
  for insert with check (public.is_backup_admin(empresa_id));
create policy "backup_integrity_checks_insert" on public.backup_integrity_checks
  for insert with check (public.is_backup_admin(empresa_id));

-- Audit and change logs: operators (admin+director) can write audit events.
create policy "backup_audit_log_insert" on public.backup_audit_log
  for insert with check (public.is_backup_operator(empresa_id));
create policy "backup_change_log_insert" on public.backup_change_log
  for insert with check (public.is_backup_operator(empresa_id));

-- restore_runs: operators can INSERT (request), only admins can UPDATE/DELETE.
create policy "restore_runs_insert" on public.restore_runs
  for insert with check (public.is_backup_operator(empresa_id));
create policy "restore_runs_update" on public.restore_runs
  for update using (public.is_backup_admin(empresa_id))
  with check (public.is_backup_admin(empresa_id));
create policy "restore_runs_delete" on public.restore_runs
  for delete using (public.is_backup_admin(empresa_id));

-- system_maintenance: admin only.
create policy "system_maintenance_write" on public.system_maintenance
  for all using (public.is_backup_admin(empresa_id))
  with check (public.is_backup_admin(empresa_id));

notify pgrst, 'reload schema';
