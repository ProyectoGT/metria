ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS posicion INT DEFAULT NULL;

-- Inicializar posiciones existentes según el orden actual (planta, puerta) por finca
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY finca_id ORDER BY planta, puerta) - 1 AS pos
  FROM public.propiedades
)
UPDATE public.propiedades p
SET posicion = ordered.pos
FROM ordered
WHERE p.id = ordered.id;
