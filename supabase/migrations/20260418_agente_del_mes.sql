CREATE TABLE IF NOT EXISTS agente_del_mes (
  id            BIGSERIAL PRIMARY KEY,
  empresa_id    BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mes           TEXT NOT NULL,
  premio        TEXT NOT NULL,
  agente_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  agente_nombre TEXT,
  anadido_por   TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id)
);

CREATE OR REPLACE FUNCTION update_agente_del_mes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER agente_del_mes_updated_at
  BEFORE UPDATE ON agente_del_mes
  FOR EACH ROW EXECUTE FUNCTION update_agente_del_mes_updated_at();

ALTER TABLE agente_del_mes ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados de la misma empresa pueden leer
CREATE POLICY "agente_del_mes_select"
  ON agente_del_mes FOR SELECT TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_id = auth.uid()
    )
  );

-- Solo Admin, Director y Responsable pueden escribir
CREATE POLICY "agente_del_mes_write"
  ON agente_del_mes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid()
        AND rol IN ('Administrador', 'Director', 'Responsable')
        AND empresa_id = agente_del_mes.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid()
        AND rol IN ('Administrador', 'Director', 'Responsable')
    )
  );
