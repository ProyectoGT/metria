create or replace function public.delete_finca_cascade(target_finca_id bigint)
returns table (
  deleted_propiedades integer,
  deleted_fincas integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  propiedades_count integer := 0;
  fincas_count integer := 0;
begin
  delete from public.propiedades
  where finca_id = target_finca_id;

  get diagnostics propiedades_count = row_count;

  delete from public.fincas
  where id = target_finca_id;

  get diagnostics fincas_count = row_count;

  return query
  select propiedades_count, fincas_count;
end;
$$;

create or replace function public.delete_sector_cascade(target_sector_id bigint)
returns table (
  deleted_propiedades integer,
  deleted_fincas integer,
  deleted_sectores integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  propiedades_count integer := 0;
  fincas_count integer := 0;
  sectores_count integer := 0;
begin
  delete from public.propiedades
  where finca_id in (
    select id
    from public.fincas
    where sector_id = target_sector_id
  );

  get diagnostics propiedades_count = row_count;

  delete from public.fincas
  where sector_id = target_sector_id;

  get diagnostics fincas_count = row_count;

  delete from public.sectores
  where id = target_sector_id;

  get diagnostics sectores_count = row_count;

  return query
  select propiedades_count, fincas_count, sectores_count;
end;
$$;

create or replace function public.delete_zona_cascade(target_zona_id bigint)
returns table (
  deleted_propiedades integer,
  deleted_fincas integer,
  deleted_sectores integer,
  deleted_zonas integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  propiedades_count integer := 0;
  fincas_count integer := 0;
  sectores_count integer := 0;
  zonas_count integer := 0;
begin
  delete from public.propiedades
  where finca_id in (
    select f.id
    from public.fincas f
    join public.sectores s on s.id = f.sector_id
    where s.zona_id = target_zona_id
  );

  get diagnostics propiedades_count = row_count;

  delete from public.fincas
  where sector_id in (
    select id
    from public.sectores
    where zona_id = target_zona_id
  );

  get diagnostics fincas_count = row_count;

  delete from public.sectores
  where zona_id = target_zona_id;

  get diagnostics sectores_count = row_count;

  delete from public.zona
  where id = target_zona_id;

  get diagnostics zonas_count = row_count;

  return query
  select propiedades_count, fincas_count, sectores_count, zonas_count;
end;
$$;
