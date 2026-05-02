-- Eliminar la columna "puesto" de la tabla usuarios.
-- El campo "rol" ya contiene la misma información y es el que usa el CRM.
-- IMPORTANTE: ejecutar DESPUÉS de que el código deje de referenciar "puesto".

-- 1. Copiar datos de puesto a rol donde rol esté vacío (safety net)
UPDATE public.usuarios
  SET rol = puesto
  WHERE (rol IS NULL OR rol = '') AND puesto IS NOT NULL AND puesto != '';

-- 2. Hacer rol NOT NULL con default 'Agente'
ALTER TABLE public.usuarios
  ALTER COLUMN rol SET DEFAULT 'Agente';

ALTER TABLE public.usuarios
  ALTER COLUMN rol SET NOT NULL;

-- 3. Eliminar la columna puesto
ALTER TABLE public.usuarios
  DROP COLUMN IF EXISTS puesto;
