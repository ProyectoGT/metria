-- ─── Fix: columna "activo" no existe en tabla usuarios ────────────────────────
-- La tabla usuarios usa "estado" (text), no "activo" (boolean).
-- El RPC create_agenda_activity referenciaba incorrectamente activo = TRUE.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Reemplazar RPC create_agenda_activity ──────────────────────────────────

CREATE OR REPLACE FUNCTION create_agenda_activity(
  p_description       TEXT,
  p_event_date        DATE,
  p_time              TEXT          DEFAULT NULL,
  p_time_end          TEXT          DEFAULT NULL,
  p_priority          TEXT          DEFAULT 'media',
  p_tipo              TEXT          DEFAULT 'actividad',
  p_completed         BOOLEAN       DEFAULT FALSE,
  p_result            TEXT          DEFAULT NULL,
  p_assigned_user_ids INTEGER[]     DEFAULT NULL,
  p_visibility        TEXT          DEFAULT 'private',
  p_reminder_minutes  INTEGER       DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id     INTEGER;
  v_empresa_id  INTEGER;
  v_equipo_id   INTEGER;
  v_agenda_id   INTEGER;
  v_assigned    INTEGER[];
BEGIN
  -- Contexto del usuario actual
  SELECT id, empresa_id, equipo_id
  INTO v_user_id, v_empresa_id, v_equipo_id
  FROM usuarios
  WHERE auth_id = auth.uid()
    AND estado = 'active'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado o inactivo';
  END IF;

  -- Al menos un usuario asignado (obligatorio)
  v_assigned := COALESCE(p_assigned_user_ids, ARRAY[v_user_id]);
  IF array_length(v_assigned, 1) = 0 THEN
    RAISE EXCEPTION 'Debe asignarse al menos un usuario';
  END IF;

  -- Insertar actividad
  INSERT INTO agenda (
    description, event_date, time, time_end,
    priority, tipo, completed, result,
    user_id, owner_user_id, empresa_id, equipo_id,
    visibility, reminder_minutes_before
  )
  VALUES (
    TRIM(p_description),
    p_event_date,
    NULLIF(TRIM(COALESCE(p_time, '')), ''),
    NULLIF(TRIM(COALESCE(p_time_end, '')), ''),
    p_priority,
    p_tipo,
    p_completed,
    NULLIF(TRIM(COALESCE(p_result, '')), ''),
    v_assigned[1],
    v_user_id,
    v_empresa_id,
    v_equipo_id,
    p_visibility,
    p_reminder_minutes
  )
  RETURNING id INTO v_agenda_id;

  -- Insertar asignaciones
  INSERT INTO agenda_usuarios (agenda_id, usuario_id)
  SELECT v_agenda_id, uid
  FROM UNNEST(v_assigned) AS uid
  ON CONFLICT (agenda_id, usuario_id) DO NOTHING;

  -- Upsert recordatorio si aplica
  IF p_reminder_minutes IS NOT NULL THEN
    PERFORM upsert_agenda_reminders(v_agenda_id, p_event_date, p_time, p_reminder_minutes, v_empresa_id);
  END IF;

  RETURN json_build_object('id', v_agenda_id);
END;
$$;

COMMENT ON FUNCTION create_agenda_activity(TEXT, DATE, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INTEGER[], TEXT, INTEGER) IS 'Crea actividad en agenda con usuarios asignados, hora de fin y recordatorio. Fix: estado = activo en lugar de activo = TRUE.';
