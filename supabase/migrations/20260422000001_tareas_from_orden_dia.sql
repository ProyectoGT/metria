ALTER TABLE tareas ADD COLUMN IF NOT EXISTS from_orden_dia boolean DEFAULT false NOT NULL;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS resultado text;
