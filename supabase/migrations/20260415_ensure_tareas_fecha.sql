-- Garantiza que la columna 'fecha' existe en tareas.
-- Si la BD usa 'fecha_limite', la renombra a 'fecha' para unificar con el types.
do $$
begin
  -- Si existe fecha_limite pero no fecha, renombrar
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tareas'
      and column_name = 'fecha_limite'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tareas'
      and column_name = 'fecha'
  ) then
    alter table public.tareas rename column fecha_limite to fecha;

  -- Si no existe ninguna, crearla
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tareas'
      and column_name = 'fecha'
  ) then
    alter table public.tareas add column fecha timestamptz;
  end if;
end;
$$;

-- Refresca el schema cache de PostgREST
notify pgrst, 'reload schema';
