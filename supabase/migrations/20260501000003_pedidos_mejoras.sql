-- Eliminar constraint de tipo_propiedad si existe (era el bug que impedía guardar)
alter table public.pedidos drop constraint if exists pedidos_tipo_propiedad_check;

-- Modalidad: reemplaza el booleano compra_alquiler con tres opciones (CV, CH, ALQ)
alter table public.pedidos add column if not exists modalidad text;

-- Migrar datos existentes
update public.pedidos
set modalidad = case
  when compra_alquiler = true  then 'CV'
  when compra_alquiler = false then 'ALQ'
  else null
end
where modalidad is null and compra_alquiler is not null;

-- Zona de búsqueda como texto libre (reemplaza la FK a zona)
alter table public.pedidos add column if not exists zona_busqueda text;

-- Nuevos campos
alter table public.pedidos add column if not exists banos integer;
alter table public.pedidos add column if not exists altura_deseada text;

-- IDs de agentes/responsables para alcance granular
alter table public.pedidos add column if not exists visibility_agente_ids integer[];
