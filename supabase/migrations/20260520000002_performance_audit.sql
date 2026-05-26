-- ============================================================
-- Migración: performance-audit
-- Fecha: 2026-05-20
-- ============================================================
-- Objetivo: Auditoría de rendimiento y esquema.
--   Añade timestamps, soft delete e índices críticos que
--   faltaban tras el análisis del modelo de datos.
--
-- Cambios:
--   1. Función genérica set_updated_at() compartida
--   2. tareas → created_at, updated_at, trigger
--   3. pedidos → created_at, updated_at, archived_at, trigger
--   4. Índices en propiedades (estado, empresa_id, agente, finca)
--   5. Índices en usuarios (empresa_id, supervisor_id, estado)
--   6. Índices en pedidos (empresa_id, owner, created_at, archived_at)
--   7. Índices complementarios en tareas y agenda
--   8. Índices en fincas/sectores (jerarquía geográfica)
--   9. ANALYZE de tablas críticas
--
-- Seguridad:
--   • ADD COLUMN IF NOT EXISTS   → idempotente
--   • CREATE INDEX IF NOT EXISTS → idempotente
--   • CREATE OR REPLACE FUNCTION → idempotente
--   • DROP TRIGGER IF EXISTS antes de CREATE TRIGGER
--   • No modifica datos existentes
--   • No cambia ni elimina columnas, RLS ni constraints
-- ============================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNCIÓN GENÉRICA set_updated_at()
--    Reutilizable por cualquier trigger de tabla. Si ya existe con el mismo
--    nombre en otro módulo se sobreescribe de forma segura (misma lógica).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TIMESTAMPS EN tareas
--    La tabla se creó sin created_at ni updated_at. Los rows existentes
--    recibirán created_at = momento de esta migración (aceptable en desarrollo).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.tareas
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz;

drop trigger if exists trg_tareas_updated_at on public.tareas;
create trigger trg_tareas_updated_at
  before update on public.tareas
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TIMESTAMPS + SOFT DELETE EN pedidos
--    pedidos nunca tuvo created_at/updated_at ni posibilidad de borrado suave.
--    Se añaden ahora para consistencia y auditoría.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.pedidos
  add column if not exists created_at   timestamptz not null default now(),
  add column if not exists updated_at   timestamptz,
  add column if not exists archived_at  timestamptz,
  add column if not exists archived_reason text;

drop trigger if exists trg_pedidos_updated_at on public.pedidos;
create trigger trg_pedidos_updated_at
  before update on public.pedidos
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ÍNDICES EN propiedades
--    propiedades.updated_at y su trigger ya existen (20260503000014).
--    Solo faltan los índices de filtrado y ordenación.
-- ─────────────────────────────────────────────────────────────────────────────

-- estado: filtro principal del dashboard (noticia, investigacion, seguimiento…)
create index if not exists idx_propiedades_estado
  on public.propiedades (estado)
  where estado is not null;

-- (empresa_id, estado): compuesto para todas las queries del dashboard.
-- Cubre "dame las noticias/encargos de esta empresa".
create index if not exists idx_propiedades_empresa_estado
  on public.propiedades (empresa_id, estado)
  where estado is not null;

-- agente_asignado: "propiedades de este agente"
create index if not exists idx_propiedades_agente_asignado
  on public.propiedades (agente_asignado)
  where agente_asignado is not null;

-- (empresa_id, agente_asignado): "mis propiedades en esta empresa"
create index if not exists idx_propiedades_empresa_agente
  on public.propiedades (empresa_id, agente_asignado)
  where agente_asignado is not null;

-- finca_id: JOIN con fincas → sectores → zonas (muy frecuente en listados)
create index if not exists idx_propiedades_finca_id
  on public.propiedades (finca_id)
  where finca_id is not null;

-- empresa_id sólo: count multi-tenant sin filtro de estado
create index if not exists idx_propiedades_empresa_id
  on public.propiedades (empresa_id);

-- created_at: ordenamiento por captación reciente
create index if not exists idx_propiedades_created_at
  on public.propiedades (created_at desc);

-- latitud/longitud: queries del mapa (propiedades con coordenadas)
create index if not exists idx_propiedades_latlon
  on public.propiedades (latitud, longitud)
  where latitud is not null and longitud is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ÍNDICES EN usuarios
-- ─────────────────────────────────────────────────────────────────────────────

-- empresa_id: todas las queries "usuarios de esta empresa"
create index if not exists idx_usuarios_empresa_id
  on public.usuarios (empresa_id)
  where empresa_id is not null;

-- supervisor_id: jerarquía Responsable → Agentes (getCurrentUserContext lo usa)
create index if not exists idx_usuarios_supervisor_id
  on public.usuarios (supervisor_id)
  where supervisor_id is not null;

-- estado: filtro de activos/invitados/deshabilitados
create index if not exists idx_usuarios_estado
  on public.usuarios (estado);

-- (empresa_id, rol): "todos los agentes de esta empresa"
create index if not exists idx_usuarios_empresa_rol
  on public.usuarios (empresa_id, rol)
  where empresa_id is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ÍNDICES EN pedidos
-- ─────────────────────────────────────────────────────────────────────────────

-- empresa_id: filtro multi-tenant (query de count del dashboard)
create index if not exists idx_pedidos_empresa_id
  on public.pedidos (empresa_id)
  where empresa_id is not null;

-- owner_user_id: "solicitudes de este agente"
create index if not exists idx_pedidos_owner_user_id
  on public.pedidos (owner_user_id)
  where owner_user_id is not null;

-- created_at: ordenamiento y búsqueda temporal (solo activos)
create index if not exists idx_pedidos_created_at
  on public.pedidos (created_at desc)
  where archived_at is null;

-- archived_at: soft-delete lookups
create index if not exists idx_pedidos_archived_at
  on public.pedidos (archived_at)
  where archived_at is not null;

-- (empresa_id, owner_user_id): query combinada frecuente
create index if not exists idx_pedidos_empresa_owner
  on public.pedidos (empresa_id, owner_user_id)
  where archived_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ÍNDICES COMPLEMENTARIOS EN tareas
--    Los índices principales ya existen en 20260503000002.
--    Solo añadimos los que faltan.
-- ─────────────────────────────────────────────────────────────────────────────

-- created_at: ordenamiento por creación reciente
create index if not exists idx_tareas_created_at
  on public.tareas (created_at desc)
  where archived_at is null;


-- (empresa_id, estado): combinación frecuente en dashboard
create index if not exists idx_tareas_empresa_estado
  on public.tareas (empresa_id, estado)
  where archived_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ÍNDICES COMPLEMENTARIOS EN agenda
--    Los índices principales ya existen en 20260503000002.
-- ─────────────────────────────────────────────────────────────────────────────

-- tipo: filtros por tipo de actividad (llamada, visita, reunion…)
create index if not exists idx_agenda_tipo
  on public.agenda (tipo)
  where archived_at is null and tipo is not null;

-- (empresa_id, event_date): calendario del día para toda la empresa
create index if not exists idx_agenda_empresa_date
  on public.agenda (empresa_id, event_date)
  where archived_at is null;

-- completed + event_date: "actividades pendientes del día"
create index if not exists idx_agenda_completed_date
  on public.agenda (completed, event_date)
  where archived_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ÍNDICES EN jerarquía geográfica (zona → sectores → fincas)
--    Los FK existen pero no crean índices implícitos en PostgreSQL.
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_sectores_zona_id
  on public.sectores (zona_id);

create index if not exists idx_fincas_sector_id
  on public.fincas (sector_id);

-- zona_id en zona_acceso (control de acceso a zonas por usuario)
create index if not exists idx_zona_acceso_zona_id
  on public.zona_acceso (zona_id);

create index if not exists idx_zona_acceso_usuario_id
  on public.zona_acceso (usuario_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ÍNDICES EN encargo_notas y encargo_visitas
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_encargo_notas_propiedad_id
  on public.encargo_notas (propiedad_id, created_at desc);

-- encargo_visitas puede no existir en todas las instancias
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'encargo_visitas'
  ) then
    execute $idx$
      create index if not exists idx_encargo_visitas_propiedad_id
        on public.encargo_visitas (propiedad_id, created_at desc)
    $idx$;
  end if;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ÍNDICES EN actividad_desarrollo (complementarios)
--    Los índices principales ya existen (agente_period, empresa_period, unique).
-- ─────────────────────────────────────────────────────────────────────────────

-- metric + período: reporting por tipo de métrica
create index if not exists idx_actividad_desarrollo_metric_date
  on public.actividad_desarrollo (metric, occurred_at desc);

-- source_table + source_id: buscar actividades vinculadas a una entidad
create index if not exists idx_actividad_desarrollo_source
  on public.actividad_desarrollo (source_table, source_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. ANALYZE — actualiza estadísticas del planificador de consultas
--    Necesario para que los nuevos índices sean elegidos por el optimizador.
-- ─────────────────────────────────────────────────────────────────────────────

analyze public.propiedades;
analyze public.pedidos;
analyze public.tareas;
analyze public.agenda;
analyze public.usuarios;
analyze public.sectores;
analyze public.fincas;
analyze public.actividad_desarrollo;
