-- Fase 4: soporte real de backups incrementales
-- Añade base_full_backup_id a backup_runs e índices para validación de cadena

alter table public.backup_runs
  add column if not exists base_full_backup_id uuid references public.backup_runs(id) on delete restrict;

comment on column public.backup_runs.base_full_backup_id is
  'ID del backup total base de la cadena incremental. Null en backups totales.';

-- Índice para consultas de cadena y limpieza
create index if not exists idx_backup_runs_base_full
  on public.backup_runs(base_full_backup_id)
  where base_full_backup_id is not null;

-- Índice para buscar incrementales no procesados en el change log
create index if not exists idx_backup_change_log_unprocessed
  on public.backup_change_log(empresa_id, changed_at)
  where processed_at is null;

-- Índice para buscar cambios por entidad
create index if not exists idx_backup_change_log_entity
  on public.backup_change_log(empresa_id, entity_type, changed_at);
