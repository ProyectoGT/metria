-- ==============================================================================
-- Fix global_search_index trigger functions: add SECURITY DEFINER
-- Without it, triggers run as the authenticated user and fail RLS on INSERT
-- because global_search_index only has a SELECT policy.
-- ==============================================================================

-- 1. Contactos
create or replace function sync_contacto_search()
returns trigger
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from global_search_index where entity_type = 'contacto' and entity_id = old.id::text;
    return old;
  end if;

  insert into global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  values (
    'contacto',
    new.id::text,
    coalesce(new.nombre, '') || ' ' || coalesce(new.apellidos, ''),
    coalesce(new.tipo, '') || ' · ' || coalesce(new.email, '') || ' · ' || coalesce(new.telefono, ''),
    unaccent_lower(coalesce(new.nombre, '') || ' ' || coalesce(new.apellidos, '') || ' ' || coalesce(new.email, '') || ' ' || coalesce(new.telefono, '') || ' ' || coalesce(new.empresa, '')),
    '/contactos',
    new.empresa_id,
    new.owner_user_id
  )
  on conflict (entity_type, entity_id) do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    search_text = excluded.search_text,
    updated_at = now();

  return new;
end;
$$ language plpgsql;

-- 2. Propiedades
create or replace function sync_propiedad_search()
returns trigger
security definer
set search_path = public
as $$
declare
  finca_numero text;
  sector_id int;
  zona_id int;
  sub text;
begin
  if tg_op = 'DELETE' then
    delete from global_search_index where entity_type = 'propiedad' and entity_id = old.id::text;
    return old;
  end if;

  select f.numero, s.id, s.zona_id into finca_numero, sector_id, zona_id
  from fincas f join sectores s on f.sector_id = s.id
  where f.id = new.finca_id;

  sub := 'Finca ' || coalesce(finca_numero, '') || coalesce(' · Planta ' || new.planta, '') || coalesce(' Puerta ' || new.puerta, '');

  insert into global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  values (
    'propiedad',
    new.id::text,
    coalesce(new.propietario, 'Propiedad #' || new.id),
    sub,
    unaccent_lower(coalesce(new.propietario, '') || ' ' || sub || ' ' || coalesce(new.estado, '')),
    '/zona/' || coalesce(zona_id::text, '') || '/sector/' || coalesce(sector_id::text, '') || '/finca/' || coalesce(new.finca_id::text, ''),
    new.empresa_id,
    new.owner_user_id
  )
  on conflict (entity_type, entity_id) do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    search_text = excluded.search_text,
    href = excluded.href,
    updated_at = now();

  return new;
end;
$$ language plpgsql;

-- 3. Pedidos
create or replace function sync_pedido_search()
returns trigger
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from global_search_index where entity_type = 'pedido' and entity_id = old.id::text;
    return old;
  end if;

  insert into global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  values (
    'pedido',
    new.id::text,
    coalesce(new.nombre_cliente, 'Pedido #' || new.id),
    coalesce(new.tipo_propiedad, '') || ' · ' || coalesce(new.origen, ''),
    unaccent_lower(coalesce(new.nombre_cliente, '') || ' ' || coalesce(new.tipo_propiedad, '') || ' ' || coalesce(new.origen, '') || ' ' || coalesce(new.referencia, '')),
    '/solicitudes/' || new.id,
    new.empresa_id,
    new.owner_user_id
  )
  on conflict (entity_type, entity_id) do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    search_text = excluded.search_text,
    updated_at = now();

  return new;
end;
$$ language plpgsql;

-- 4. Agenda
create or replace function sync_agenda_search()
returns trigger
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from global_search_index where entity_type = 'agenda' and entity_id = old.id::text;
    return old;
  end if;

  insert into global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  values (
    'agenda',
    new.id::text,
    coalesce(new.description, 'Actividad #' || new.id),
    coalesce(new.tipo, '') || ' · ' || coalesce(new.event_date::text, ''),
    unaccent_lower(coalesce(new.description, '') || ' ' || coalesce(new.tipo, '') || ' ' || coalesce(new.result, '')),
    '/calendario',
    new.empresa_id,
    new.owner_user_id
  )
  on conflict (entity_type, entity_id) do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    search_text = excluded.search_text,
    updated_at = now();

  return new;
end;
$$ language plpgsql;

-- 5. Tareas
create or replace function sync_tarea_search()
returns trigger
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from global_search_index where entity_type = 'tarea' and entity_id = old.id::text;
    return old;
  end if;

  insert into global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  values (
    'tarea',
    new.id::text,
    coalesce(new.titulo, 'Tarea #' || new.id),
    coalesce(new.estado, ''),
    unaccent_lower(coalesce(new.titulo, '') || ' ' || coalesce(new.resultado, '')),
    '/dashboard',
    new.empresa_id,
    new.owner_user_id
  )
  on conflict (entity_type, entity_id) do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    search_text = excluded.search_text,
    updated_at = now();

  return new;
end;
$$ language plpgsql;

notify pgrst, 'reload schema';
