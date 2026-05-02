CREATE TABLE IF NOT EXISTS kanban_columnas (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  col_id     TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  orden      INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, col_id)
);

ALTER TABLE kanban_columnas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_columnas_own"
  ON kanban_columnas FOR ALL TO authenticated
  USING (
    user_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );
