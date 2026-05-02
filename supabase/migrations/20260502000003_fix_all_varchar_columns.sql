-- Convierte a text las columnas varchar cortas en tareas (prioridad, estado)
-- que pueden recibir valores como "pendiente", "completado", etc.
-- Hay que dropear el trigger que referencia "estado" antes de cambiar el tipo.

drop trigger if exists trg_tareas_desarrollo_activity on public.tareas;

alter table public.tareas
  alter column prioridad type text,
  alter column estado type text;

-- Recrear el trigger
create trigger trg_tareas_desarrollo_activity
after update of estado on public.tareas
for each row
execute function public.track_tarea_desarrollo_activity();

notify pgrst, 'reload schema';
