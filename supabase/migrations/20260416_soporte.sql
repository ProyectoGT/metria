-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: contactos_soporte
-- Administradores de contacto visibles por todos los usuarios del CRM.
-- Solo los Administradores pueden crear, editar o borrar contactos.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contactos_soporte (
  id        BIGSERIAL PRIMARY KEY,
  nombre    TEXT NOT NULL,
  apellidos TEXT,
  telefono  TEXT,
  email     TEXT,
  cargo     TEXT DEFAULT 'Administrador',
  orden     INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO contactos_soporte (nombre, apellidos, telefono, email, cargo, orden) VALUES
  ('Bilal',  'El Arbi Riach',  '+34617014230', 'bilalelarbi.ma@outlook.es', 'Administrador', 1),
  ('Marc',   'Morente López',  '+34684265319', NULL,                         'Administrador', 2);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: tickets_soporte
-- Incidencias enviadas por los usuarios. Los usuarios ven sus propios tickets;
-- los Administradores ven todos.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets_soporte (
  id                   BIGSERIAL PRIMARY KEY,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  user_id              BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre_usuario       TEXT,                          -- nombre completo al momento de crear
  tipo                 TEXT NOT NULL,
  asunto               TEXT NOT NULL,
  descripcion          TEXT NOT NULL,
  prioridad            TEXT NOT NULL DEFAULT 'media', -- alta | media | baja
  estado               TEXT NOT NULL DEFAULT 'abierto', -- abierto | en_proceso | resuelto | cerrado
  respuesta            TEXT,
  respondido_por_nombre TEXT,
  respondido_at        TIMESTAMPTZ
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_tickets_soporte_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_soporte_updated_at
  BEFORE UPDATE ON tickets_soporte
  FOR EACH ROW EXECUTE FUNCTION update_tickets_soporte_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE contactos_soporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_soporte   ENABLE ROW LEVEL SECURITY;

-- Contactos: todos los autenticados pueden leer
CREATE POLICY "contactos_soporte_select"
  ON contactos_soporte FOR SELECT TO authenticated
  USING (true);

-- Contactos: solo Administradores pueden escribir
CREATE POLICY "contactos_soporte_admin_write"
  ON contactos_soporte FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid()::text AND rol = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid()::text AND rol = 'Administrador'
    )
  );

-- Tickets: usuarios ven los suyos; admins ven todos
CREATE POLICY "tickets_soporte_select"
  ON tickets_soporte FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT id FROM usuarios WHERE auth_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid()::text AND rol = 'Administrador'
    )
  );

-- Tickets: cualquier autenticado puede crear
CREATE POLICY "tickets_soporte_insert"
  ON tickets_soporte FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tickets: solo Administradores pueden actualizar (estado, respuesta)
CREATE POLICY "tickets_soporte_update"
  ON tickets_soporte FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid()::text AND rol = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid()::text AND rol = 'Administrador'
    )
  );
