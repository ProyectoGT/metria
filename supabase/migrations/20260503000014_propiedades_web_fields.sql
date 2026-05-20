-- ─── Propiedades: campos de publicación web y calidad de ficha ────────────────
-- Extiende la tabla propiedades sin romper datos existentes.
-- Todos los nuevos campos tienen DEFAULT para no afectar filas actuales.

ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS titulo              TEXT,
  ADD COLUMN IF NOT EXISTS descripcion         TEXT,
  ADD COLUMN IF NOT EXISTS precio              NUMERIC,
  ADD COLUMN IF NOT EXISTS tipo_operacion      TEXT DEFAULT 'venta',
  ADD COLUMN IF NOT EXISTS publicar_en_web     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS estado_publicacion_web TEXT DEFAULT 'no_preparada',
  ADD COLUMN IF NOT EXISTS web_titulo          TEXT,
  ADD COLUMN IF NOT EXISTS web_descripcion     TEXT,
  ADD COLUMN IF NOT EXISTS web_precio_visible  BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS web_destacada       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS web_ultima_sincronizacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS web_error_sync      TEXT,
  ADD COLUMN IF NOT EXISTS ficha_completa      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS calidad_ficha_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faltantes_ficha     JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- Constraint para estado_publicacion_web válidos
ALTER TABLE propiedades
  DROP CONSTRAINT IF EXISTS propiedades_estado_publicacion_web_check;

ALTER TABLE propiedades
  ADD CONSTRAINT propiedades_estado_publicacion_web_check
  CHECK (estado_publicacion_web IN (
    'no_preparada', 'lista_para_publicar', 'publicada', 'error_sincronizacion'
  ));

-- Constraint para tipo_operacion válidos
ALTER TABLE propiedades
  DROP CONSTRAINT IF EXISTS propiedades_tipo_operacion_check;

ALTER TABLE propiedades
  ADD CONSTRAINT propiedades_tipo_operacion_check
  CHECK (tipo_operacion IN ('venta', 'alquiler', 'venta_alquiler'));

-- ─── Índices de rendimiento ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS propiedades_empresa_id_idx
  ON propiedades (empresa_id);

CREATE INDEX IF NOT EXISTS propiedades_estado_idx
  ON propiedades (estado);

CREATE INDEX IF NOT EXISTS propiedades_agente_asignado_idx
  ON propiedades (agente_asignado);

CREATE INDEX IF NOT EXISTS propiedades_publicar_en_web_idx
  ON propiedades (publicar_en_web) WHERE publicar_en_web = TRUE;

CREATE INDEX IF NOT EXISTS propiedades_estado_publicacion_web_idx
  ON propiedades (estado_publicacion_web);

CREATE INDEX IF NOT EXISTS propiedades_empresa_estado_idx
  ON propiedades (empresa_id, estado);

CREATE INDEX IF NOT EXISTS propiedades_web_destacada_idx
  ON propiedades (web_destacada) WHERE web_destacada = TRUE;

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_propiedades_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS propiedades_updated_at_trigger ON propiedades;

CREATE TRIGGER propiedades_updated_at_trigger
  BEFORE UPDATE ON propiedades
  FOR EACH ROW EXECUTE FUNCTION set_propiedades_updated_at();
