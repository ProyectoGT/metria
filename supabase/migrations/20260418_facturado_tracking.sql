-- Añade campo honorarios a propiedades para registrar comision/honorarios al marcar como vendido
ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS honorarios NUMERIC DEFAULT NULL;

-- Función de upsert específica para facturado (a diferencia del insert normal,
-- esta actualiza el valor si ya existe el registro para esa propiedad)
CREATE OR REPLACE FUNCTION public.upsert_facturado_activity(
  target_agente_id bigint,
  target_actor_user_id bigint,
  target_source_id bigint,
  target_value numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user record;
BEGIN
  IF target_agente_id IS NULL OR target_value IS NULL OR target_value <= 0 THEN
    RETURN;
  END IF;

  SELECT id, empresa_id, equipo_id
  INTO target_user
  FROM public.usuarios
  WHERE id = target_agente_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.actividad_desarrollo (
    agente_id, actor_user_id, empresa_id, equipo_id,
    metric, action, source_table, source_id, value, metadata
  )
  VALUES (
    target_user.id, target_actor_user_id,
    target_user.empresa_id, target_user.equipo_id,
    'facturado', 'honorarios_venta', 'propiedades', target_source_id,
    target_value, '{}'::jsonb
  )
  ON CONFLICT (source_table, source_id, metric, action)
  DO UPDATE SET
    value = EXCLUDED.value,
    occurred_at = NOW();
END;
$$;

-- Actualiza el trigger de propiedades para también registrar facturado
-- cuando estado = 'vendido' y honorarios > 0
CREATE OR REPLACE FUNCTION public.track_propiedad_desarrollo_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_agente_id bigint;
  previous_estado text;
  should_track boolean := false;
BEGIN
  IF tg_op = 'INSERT' THEN
    should_track := true;
  ELSIF old.estado IS DISTINCT FROM new.estado
     OR old.honorarios IS DISTINCT FROM new.honorarios THEN
    previous_estado := old.estado;
    should_track := true;
  END IF;

  IF NOT should_track THEN
    RETURN NEW;
  END IF;

  target_agente_id := COALESCE(
    new.agente_asignado,
    new.owner_user_id,
    public.current_usuario_id()
  );

  -- Encargo
  IF new.estado = 'encargo' AND (tg_op = 'INSERT' OR old.estado IS DISTINCT FROM new.estado) THEN
    PERFORM public.insert_desarrollo_activity(
      target_agente_id,
      public.current_usuario_id(),
      'encargos',
      'propiedad_encargo',
      'propiedades',
      new.id,
      1,
      jsonb_build_object('estado_anterior', previous_estado)
    );
  END IF;

  -- Venta (conteo)
  IF new.estado = 'vendido' AND (tg_op = 'INSERT' OR old.estado IS DISTINCT FROM new.estado) THEN
    PERFORM public.insert_desarrollo_activity(
      target_agente_id,
      public.current_usuario_id(),
      'ventas',
      'propiedad_vendida',
      'propiedades',
      new.id,
      1,
      jsonb_build_object('estado_anterior', previous_estado)
    );
  END IF;

  -- Facturado: se registra/actualiza cuando estado = 'vendido' y honorarios > 0
  IF new.estado = 'vendido' AND new.honorarios IS NOT NULL AND new.honorarios > 0 THEN
    PERFORM public.upsert_facturado_activity(
      target_agente_id,
      public.current_usuario_id(),
      new.id,
      new.honorarios
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recrear el trigger para que capture también cambios en honorarios
DROP TRIGGER IF EXISTS trg_propiedades_desarrollo_activity ON public.propiedades;
CREATE TRIGGER trg_propiedades_desarrollo_activity
  AFTER INSERT OR UPDATE OF estado, agente_asignado, owner_user_id, honorarios
  ON public.propiedades
  FOR EACH ROW
  EXECUTE FUNCTION public.track_propiedad_desarrollo_activity();
