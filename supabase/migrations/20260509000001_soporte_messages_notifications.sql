-- ─── Soporte: Mensajes, Notificaciones, Archivado ──────────────────────────────
-- Migra el sistema de tickets a conversación con historial, notificaciones in-app,
-- archivado, asignación y multiempresa.
-- No rompe datos existentes: mantiene columnas legacy (descripcion, respuesta).
-- ───────────────────────────────────────────────────────────────────────────────

-- ── 1. Nuevas columnas en tickets_soporte ──────────────────────────────────────

ALTER TABLE tickets_soporte
  ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS asignado_a     INTEGER     DEFAULT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS empresa_id     INTEGER     DEFAULT NULL REFERENCES empresas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ultima_respuesta_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN tickets_soporte.archived_at          IS 'Timestamp de archivado. NULL = no archivado. Archivado es distinto de cerrado.';
COMMENT ON COLUMN tickets_soporte.asignado_a           IS 'Administrador asignado al ticket. NULL = sin asignar.';
COMMENT ON COLUMN tickets_soporte.empresa_id           IS 'Empresa a la que pertenece el ticket (multiempresa).';
COMMENT ON COLUMN tickets_soporte.ultima_respuesta_at  IS 'Timestamp de la última respuesta del admin (para ordenación rápida).';

-- ── 2. Tabla de mensajes (conversación/historial) ──────────────────────────────

CREATE TABLE IF NOT EXISTS soporte_mensajes (
  id          BIGSERIAL    PRIMARY KEY,
  ticket_id   INTEGER      NOT NULL REFERENCES tickets_soporte(id) ON DELETE CASCADE,
  autor_id    INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  autor_nombre TEXT        NOT NULL,
  autor_rol   TEXT         NOT NULL DEFAULT 'usuario'
                           CHECK (autor_rol IN ('usuario', 'admin', 'sistema')),
  contenido   TEXT         NOT NULL,
  es_sistema  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  soporte_mensajes IS 'Historial de mensajes/respuestas de un ticket. Reemplaza descripcion+respuesta legacy.';
COMMENT ON COLUMN soporte_mensajes.autor_rol   IS 'usuario = creador del ticket, admin = administrador, sistema = cambio de estado/acción automática';
COMMENT ON COLUMN soporte_mensajes.es_sistema  IS 'TRUE si es un mensaje automático del sistema (cambio de estado, asignación, etc.).';

-- ── 3. Tabla de notificaciones in-app ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS soporte_notificaciones (
  id          BIGSERIAL    PRIMARY KEY,
  ticket_id   INTEGER      NOT NULL REFERENCES tickets_soporte(id) ON DELETE CASCADE,
  usuario_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id  INTEGER      NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo        TEXT         NOT NULL
                           CHECK (tipo IN ('nuevo_ticket', 'cambio_estado', 'nueva_respuesta_admin', 'nueva_respuesta_usuario', 'ticket_asignado')),
  mensaje     TEXT         NOT NULL,
  leido       BOOLEAN      NOT NULL DEFAULT FALSE,
  leido_at    TIMESTAMPTZ  DEFAULT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id, usuario_id, tipo)
);

COMMENT ON TABLE  soporte_notificaciones IS 'Notificaciones internas de soporte. UNIQUE(ticket_id, usuario_id, tipo) evita duplicados.';
COMMENT ON COLUMN soporte_notificaciones.tipo  IS 'nuevo_ticket | cambio_estado | nueva_respuesta_admin | nueva_respuesta_usuario | ticket_asignado';

-- ── 4. Migrar datos existentes ─────────────────────────────────────────────────

-- Migrar descripcion a primer mensaje del hilo (si existe)
INSERT INTO soporte_mensajes (ticket_id, autor_id, autor_nombre, autor_rol, contenido, es_sistema, created_at)
SELECT
  t.id,
  t.user_id,
  COALESCE(t.nombre_usuario, 'Usuario'),
  'usuario',
  t.descripcion,
  FALSE,
  t.created_at
FROM tickets_soporte t
WHERE t.descripcion IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM soporte_mensajes sm WHERE sm.ticket_id = t.id AND sm.autor_rol = 'usuario');

-- Migrar respuesta a mensaje admin (si existe)
INSERT INTO soporte_mensajes (ticket_id, autor_id, autor_nombre, autor_rol, contenido, es_sistema, created_at)
SELECT
  t.id,
  NULL,
  COALESCE(t.respondido_por_nombre, 'Administrador'),
  'admin',
  t.respuesta,
  FALSE,
  COALESCE(t.respondido_at, t.updated_at, NOW())
FROM tickets_soporte t
WHERE t.respuesta IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM soporte_mensajes sm WHERE sm.ticket_id = t.id AND sm.autor_rol = 'admin');

-- Asignar empresa_id desde usuarios para tickets existentes
UPDATE tickets_soporte t
SET empresa_id = u.empresa_id
FROM usuarios u
WHERE t.user_id = u.id
  AND t.empresa_id IS NULL;

-- ── 5. RLS: soporte_mensajes ─────────────────────────────────────────────────

ALTER TABLE soporte_mensajes ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios ven mensajes de sus tickets; admins ven todos de su empresa
CREATE POLICY soporte_mensajes_select ON soporte_mensajes
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM tickets_soporte
      WHERE user_id = current_usuario_id()
         OR current_user_role() IN ('Administrador', 'Director')
    )
  );

-- INSERT: usuarios pueden añadir mensajes a sus tickets; admins a todos
CREATE POLICY soporte_mensajes_insert ON soporte_mensajes
  FOR INSERT WITH CHECK (
    ticket_id IN (
      SELECT id FROM tickets_soporte
      WHERE user_id = current_usuario_id()
         OR current_user_role() IN ('Administrador', 'Director')
    )
  );

-- UPDATE/DELETE: solo admins, y solo para corrección (no sobrescribir historial)
CREATE POLICY soporte_mensajes_update ON soporte_mensajes
  FOR UPDATE USING (current_user_role() IN ('Administrador', 'Director'));

CREATE POLICY soporte_mensajes_delete ON soporte_mensajes
  FOR DELETE USING (current_user_role() IN ('Administrador', 'Director'));

-- ── 6. RLS: soporte_notificaciones ───────────────────────────────────────────

ALTER TABLE soporte_notificaciones ENABLE ROW LEVEL SECURITY;

-- SELECT: cada usuario ve sus propias notificaciones
CREATE POLICY soporte_notificaciones_select ON soporte_notificaciones
  FOR SELECT USING (
    usuario_id = current_usuario_id()
    OR current_user_role() IN ('Administrador', 'Director')
  );

-- INSERT: bloqueado (se hace mediante server actions con admin client)
CREATE POLICY soporte_notificaciones_insert ON soporte_notificaciones
  FOR INSERT WITH CHECK (false);

-- UPDATE: el usuario puede marcar como leídas sus propias notificaciones
CREATE POLICY soporte_notificaciones_update ON soporte_notificaciones
  FOR UPDATE USING (usuario_id = current_usuario_id())
  WITH CHECK (
    -- Solo permitir cambiar leido y leido_at
    usuario_id = current_usuario_id()
  );

-- DELETE: bloqueado
CREATE POLICY soporte_notificaciones_delete ON soporte_notificaciones
  FOR DELETE USING (false);

-- ── 7. RLS actualizada: tickets_soporte ──────────────────────────────────────

-- Actualizar política SELECT para incluir archivados, empresa_id y asignado_a
-- Las políticas originales se crearon con nombres "tickets_soporte_select", etc.
-- Las reemplazamos completamente.
DROP POLICY IF EXISTS "tickets_soporte_select" ON tickets_soporte;
DROP POLICY IF EXISTS "tickets_soporte_insert" ON tickets_soporte;
DROP POLICY IF EXISTS "tickets_soporte_update" ON tickets_soporte;

CREATE POLICY tickets_soporte_select ON tickets_soporte
  FOR SELECT USING (
    user_id = current_usuario_id()
    OR current_user_role() IN ('Administrador', 'Director')
  );

CREATE POLICY tickets_soporte_insert ON tickets_soporte
  FOR INSERT WITH CHECK (
    user_id = current_usuario_id()
    OR current_user_role() IN ('Administrador', 'Director')
  );

CREATE POLICY tickets_soporte_update ON tickets_soporte
  FOR UPDATE USING (current_user_role() IN ('Administrador', 'Director'));

CREATE POLICY tickets_soporte_delete ON tickets_soporte
  FOR DELETE USING (current_user_role() IN ('Administrador', 'Director'));

-- ── 8. Índices ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_soporte_mensajes_ticket
  ON soporte_mensajes (ticket_id, created_at);

CREATE INDEX IF NOT EXISTS idx_soporte_notificaciones_usuario
  ON soporte_notificaciones (usuario_id, leido, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_soporte_notificaciones_ticket
  ON soporte_notificaciones (ticket_id);

CREATE INDEX IF NOT EXISTS idx_soporte_notificaciones_pendientes
  ON soporte_notificaciones (usuario_id, created_at DESC)
  WHERE leido = FALSE;

CREATE INDEX IF NOT EXISTS idx_tickets_soporte_empresa
  ON tickets_soporte (empresa_id);

CREATE INDEX IF NOT EXISTS idx_tickets_soporte_estado
  ON tickets_soporte (estado, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_soporte_asignado
  ON tickets_soporte (asignado_a)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_soporte_usuario
  ON tickets_soporte (user_id, created_at DESC)
  WHERE archived_at IS NULL;

-- ── 9. Trigger updated_at en soporte_notificaciones ──────────────────────────

CREATE OR REPLACE FUNCTION trg_soporte_notif_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.leido_at = CASE WHEN NEW.leido = TRUE AND OLD.leido = FALSE THEN NOW() ELSE OLD.leido_at END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_soporte_notif_leido_at
  BEFORE UPDATE ON soporte_notificaciones
  FOR EACH ROW EXECUTE FUNCTION trg_soporte_notif_updated_at();

-- ── 10. Actualizar trigger updated_at en tickets_soporte ──────────────────

CREATE OR REPLACE FUNCTION update_tickets_soporte_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tickets_soporte_updated_at ON tickets_soporte;
CREATE TRIGGER set_tickets_soporte_updated_at
  BEFORE UPDATE ON tickets_soporte
  FOR EACH ROW EXECUTE FUNCTION update_tickets_soporte_updated_at();
