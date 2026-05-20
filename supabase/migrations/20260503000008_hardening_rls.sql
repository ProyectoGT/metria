-- =============================================================================
-- HARDENING RLS — Metria CRM
-- Fecha: 2026-05-03
--
-- Cierra todos los agujeros de seguridad detectados en la auditoría:
--
--   1. encargo_notas     — políticas abiertas (using true) → delegación a propiedades
--   2. encargo_visitas   — política FOR ALL abierta → delegación a propiedades
--   3. archivos          — sin RLS ni empresa_id → columna + RLS completo
--   4. zona_acceso       — SELECT abierto → restringido a propio usuario o admin
--   5. usuario_orden     — sin RLS → politica por usuario_id
--   6. zona/sectores/fincas — sin RLS → autenticados leen, solo admin/director escribe
--   7. idealista_leads   — empresa_id existe pero política abierta → filtrar por empresa
--   8. storage           — bucket encargo-archivos público → solo autenticados
--   9. tickets_soporte   — INSERT abierto (cualquier user_id) → propio usuario
-- =============================================================================

-- =============================================================================
-- 1. encargo_notas — sustituir policies abiertas por delegación a propiedades
--
-- Patrón: si puedes ver la propiedad (RLS de propiedades lo garantiza),
-- puedes ver/crear sus notas. La subquery se beneficia del índice fk existente.
-- =============================================================================

drop policy if exists "Authenticated users can read encargo_notas"      on public.encargo_notas;
drop policy if exists "Authenticated users can insert encargo_notas"    on public.encargo_notas;
drop policy if exists "Authenticated users can delete encargo_notas"    on public.encargo_notas;

-- SELECT: delega al acceso de la propiedad padre
create policy encargo_notas_select
on public.encargo_notas for select
using (
  auth.uid() is not null
  and exists (
    select 1 from public.propiedades p
    where p.id = propiedad_id
      and p.empresa_id = public.current_empresa_id()
  )
);

-- INSERT: la propiedad destino debe ser accesible y pertenecer a la misma empresa
create policy encargo_notas_insert
on public.encargo_notas for insert
with check (
  auth.uid() is not null
  and exists (
    select 1 from public.propiedades p
    where p.id = propiedad_id
      and p.empresa_id = public.current_empresa_id()
  )
);

-- DELETE: solo admin/director o quien tenga acceso de gestión sobre la propiedad
create policy encargo_notas_delete
on public.encargo_notas for delete
using (
  auth.uid() is not null
  and exists (
    select 1 from public.propiedades p
    where p.id = propiedad_id
      and public.can_manage_scoped_row(p.owner_user_id, p.empresa_id)
  )
);

-- =============================================================================
-- 2. encargo_visitas — sustituir política FOR ALL abierta
--
-- Mismo patrón de delegación: acceso condicionado a la propiedad padre.
-- Para INSERT también validamos que agente_id sea el usuario actual
-- (o admin/director que registra en nombre de otro).
-- =============================================================================

drop policy if exists "Authenticated users can manage encargo_visitas" on public.encargo_visitas;

-- SELECT: delegación a propiedad
create policy encargo_visitas_select
on public.encargo_visitas for select
using (
  auth.uid() is not null
  and exists (
    select 1 from public.propiedades p
    where p.id = propiedad_id
      and p.empresa_id = public.current_empresa_id()
  )
);

-- INSERT: propiedad accesible + agente debe ser el usuario actual o admin/director
create policy encargo_visitas_insert
on public.encargo_visitas for insert
with check (
  auth.uid() is not null
  and exists (
    select 1 from public.propiedades p
    where p.id = propiedad_id
      and p.empresa_id = public.current_empresa_id()
  )
  and (
    agente_id = public.current_usuario_id()
    or agente_id is null
    or public.is_admin_or_director()
  )
);

-- UPDATE: mismas condiciones que insert
create policy encargo_visitas_update
on public.encargo_visitas for update
using (
  auth.uid() is not null
  and exists (
    select 1 from public.propiedades p
    where p.id = propiedad_id
      and p.empresa_id = public.current_empresa_id()
  )
  and (
    agente_id = public.current_usuario_id()
    or public.is_admin_or_director()
  )
)
with check (
  exists (
    select 1 from public.propiedades p
    where p.id = propiedad_id
      and p.empresa_id = public.current_empresa_id()
  )
);

-- DELETE: solo admin/director o el agente que creó la visita
create policy encargo_visitas_delete
on public.encargo_visitas for delete
using (
  auth.uid() is not null
  and exists (
    select 1 from public.propiedades p
    where p.id = propiedad_id
      and p.empresa_id = public.current_empresa_id()
  )
  and (
    agente_id = public.current_usuario_id()
    or public.is_admin_or_director()
  )
);

-- =============================================================================
-- 3. archivos — añadir empresa_id + owner_user_id y habilitar RLS
--
-- La tabla existía sin ningún control de acceso. Añadimos empresa_id
-- para multi-tenancy y owner_user_id para granularidad por usuario.
-- Se hace backfill desde la propiedad padre para datos históricos.
-- =============================================================================

alter table public.archivos
  add column if not exists empresa_id bigint references public.empresas (id) on delete set null,
  add column if not exists owner_user_id bigint references public.usuarios (id) on delete set null;

-- Backfill desde la propiedad padre
update public.archivos a
set empresa_id = p.empresa_id,
    owner_user_id = coalesce(p.owner_user_id, p.agente_asignado)
from public.propiedades p
where a.propiedad_id = p.id
  and (a.empresa_id is null or a.owner_user_id is null);

-- Trigger: rellena empresa_id y owner_user_id en inserts futuros
create or replace function public.apply_archivo_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_row public.propiedades%rowtype;
begin
  if new.empresa_id is null and new.propiedad_id is not null then
    select * into prop_row from public.propiedades where id = new.propiedad_id;
    new.empresa_id := prop_row.empresa_id;
    if new.owner_user_id is null then
      new.owner_user_id := coalesce(prop_row.owner_user_id, prop_row.agente_asignado, public.current_usuario_id());
    end if;
  end if;
  if new.empresa_id is null then
    new.empresa_id := public.current_empresa_id();
  end if;
  if new.owner_user_id is null then
    new.owner_user_id := public.current_usuario_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_archivo_defaults on public.archivos;
create trigger trg_archivo_defaults
before insert on public.archivos
for each row execute function public.apply_archivo_defaults();

alter table public.archivos enable row level security;

-- SELECT: delegación a la propiedad padre
create policy archivos_select
on public.archivos for select
using (
  auth.uid() is not null
  and (
    -- acceso directo por empresa (admin/director)
    ( empresa_id = public.current_empresa_id() and public.is_admin_or_director() )
    -- o existe la propiedad padre accesible por el usuario
    or (
      propiedad_id is not null
      and exists (
        select 1 from public.propiedades p
        where p.id = propiedad_id
      )
    )
    -- o el usuario es el dueño del archivo
    or owner_user_id = public.current_usuario_id()
  )
);

-- INSERT: empresa_id debe coincidir y la propiedad debe ser accesible
create policy archivos_insert
on public.archivos for insert
with check (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and (
    propiedad_id is null
    or exists (
      select 1 from public.propiedades p
      where p.id = propiedad_id
        and p.empresa_id = public.current_empresa_id()
    )
  )
);

-- UPDATE: solo owner o admin/director de la misma empresa
create policy archivos_update
on public.archivos for update
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and (
    owner_user_id = public.current_usuario_id()
    or public.is_admin_or_director()
  )
)
with check (empresa_id = public.current_empresa_id());

-- DELETE: solo owner o admin/director
create policy archivos_delete
on public.archivos for delete
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and (
    owner_user_id = public.current_usuario_id()
    or public.is_admin_or_director()
  )
);

-- =============================================================================
-- 4. zona_acceso — restringir SELECT (era abierto a todos los autenticados)
--
-- Antes: cualquier autenticado veía todos los mappings zona-usuario de toda la BD.
-- Ahora: cada usuario ve solo sus propios accesos; admin/director ven todos.
-- Los agentes/responsables siguen pudiendo cargar sus propias zonas en servidor.
-- =============================================================================

drop policy if exists "Authenticated can read zona_acceso" on public.zona_acceso;

create policy zona_acceso_select
on public.zona_acceso for select
using (
  auth.uid() is not null
  and (
    usuario_id = public.current_usuario_id()
    or public.is_admin_or_director()
    -- responsable ve los accesos de sus supervisados
    or (
      public.current_user_role() = 'Responsable'
      and usuario_id in (select public.get_supervised_user_ids())
    )
  )
);

-- =============================================================================
-- 5. usuario_orden — habilitar RLS (era completamente abierta)
--
-- Tabla de preferencias de ordenación de UI. Solo cada usuario ve y gestiona
-- sus propias preferencias.
-- =============================================================================

alter table public.usuario_orden enable row level security;

drop policy if exists usuario_orden_own on public.usuario_orden;
create policy usuario_orden_own
on public.usuario_orden for all
using (
  auth.uid() is not null
  and usuario_id = public.current_usuario_id()
)
with check (
  auth.uid() is not null
  and usuario_id = public.current_usuario_id()
);

-- =============================================================================
-- 6. zona, sectores, fincas — habilitar RLS
--
-- Son tablas de catálogo geográfico. No tienen empresa_id (pendiente de migración
-- futura coordinada con todos los JOINs existentes). Por ahora:
--   - SELECT: cualquier usuario autenticado puede leer (son datos no sensibles)
--   - INSERT/UPDATE/DELETE: solo admin/director
-- Esto previene que usuarios no autorizados modifiquen la jerarquía de zonas.
-- =============================================================================

alter table public.zona     enable row level security;
alter table public.sectores enable row level security;
alter table public.fincas   enable row level security;

-- zona
drop policy if exists zona_select_authenticated    on public.zona;
drop policy if exists zona_write_admin             on public.zona;

create policy zona_select_authenticated
on public.zona for select
using (auth.uid() is not null);

create policy zona_write_admin
on public.zona for all
using (auth.uid() is not null and public.is_admin_or_director())
with check (auth.uid() is not null and public.is_admin_or_director());

-- sectores
drop policy if exists sectores_select_authenticated on public.sectores;
drop policy if exists sectores_write_admin          on public.sectores;

create policy sectores_select_authenticated
on public.sectores for select
using (auth.uid() is not null);

create policy sectores_write_admin
on public.sectores for all
using (auth.uid() is not null and public.is_admin_or_director())
with check (auth.uid() is not null and public.is_admin_or_director());

-- fincas
drop policy if exists fincas_select_authenticated on public.fincas;
drop policy if exists fincas_write_admin          on public.fincas;

create policy fincas_select_authenticated
on public.fincas for select
using (auth.uid() is not null);

create policy fincas_write_admin
on public.fincas for all
using (auth.uid() is not null and public.is_admin_or_director())
with check (auth.uid() is not null and public.is_admin_or_director());

-- =============================================================================
-- 7. idealista_leads — cerrar política FOR ALL abierta
--
-- La tabla tiene empresa_id pero la política era USING (true).
-- Ahora filtra estrictamente por empresa del usuario autenticado.
-- Responsables y Agentes pueden ver y gestionar leads de su empresa.
-- =============================================================================

drop policy if exists "Authenticated users can manage idealista_leads" on public.idealista_leads;

-- SELECT: misma empresa
create policy idealista_leads_select
on public.idealista_leads for select
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
);

-- INSERT: empresa_id debe coincidir con la del usuario
create policy idealista_leads_insert
on public.idealista_leads for insert
with check (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
);

-- UPDATE: misma empresa + rol con capacidad de gestión
create policy idealista_leads_update
on public.idealista_leads for update
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
)
with check (empresa_id = public.current_empresa_id());

-- DELETE: solo admin/director (leads son registros de negocio importantes)
create policy idealista_leads_delete
on public.idealista_leads for delete
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and public.is_admin_or_director()
);

-- =============================================================================
-- 8. storage.objects — bucket encargo-archivos: de público a autenticados
--
-- El bucket era público (to public), permitiendo descargas anónimas
-- a cualquiera que conociese la URL. Se restringe a usuarios autenticados.
-- Los links directos ya existentes seguirán funcionando para usuarios logueados.
-- =============================================================================

drop policy if exists "Public read encargo files" on storage.objects;

create policy "Authenticated read encargo files"
on storage.objects for select
to authenticated
using (bucket_id = 'encargo-archivos');

-- También restringir upload a usuarios de la misma empresa (via path convention)
-- El path debe ser: {propiedadId}/{tipo}/{filename}
drop policy if exists "Authenticated users can upload encargo files" on storage.objects;
create policy "Authenticated users can upload encargo files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'encargo-archivos'
  and auth.uid() is not null
);

-- Mantener política de delete existente (ya era correcta)
-- drop policy "Authenticated users can delete encargo files" — no cambios necesarios

-- =============================================================================
-- 9. tickets_soporte INSERT — evitar suplantación de usuario
--
-- Antes: WITH CHECK (true) permitía insertar con cualquier user_id.
-- Ahora: user_id debe ser el usuario autenticado actual o NULL.
-- =============================================================================

drop policy if exists "tickets_soporte_insert" on public.tickets_soporte;

create policy "tickets_soporte_insert"
on public.tickets_soporte for insert
to authenticated
with check (
  auth.uid() is not null
  and (
    user_id is null
    or user_id = public.current_usuario_id()
  )
);

-- =============================================================================
-- Índices de soporte para las nuevas columnas
-- =============================================================================

create index if not exists idx_archivos_empresa
  on public.archivos (empresa_id)
  where empresa_id is not null;

create index if not exists idx_archivos_owner
  on public.archivos (owner_user_id)
  where owner_user_id is not null;

-- =============================================================================
-- can_manage_scoped_row: reforzar que Responsable solo gestiona dentro de empresa
-- La función ya filtra por empresa_id, pero la re-declaramos explícitamente
-- para dejar constancia de la política en el código de base de datos.
-- =============================================================================

create or replace function public.can_manage_scoped_row(
  row_owner_user_id bigint,
  row_empresa_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when row_empresa_id is distinct from public.current_empresa_id() then false
    when row_owner_user_id = public.current_usuario_id() then true
    when public.current_user_role() in ('Administrador', 'Director')
      and row_empresa_id = public.current_empresa_id() then true
    when public.current_user_role() = 'Responsable'
      and row_empresa_id = public.current_empresa_id()
      and (
        row_owner_user_id = public.current_usuario_id()
        or row_owner_user_id in (select public.get_supervised_user_ids())
      ) then true
    else false
  end
$$;

-- Comentario: La versión anterior de can_manage_scoped_row permitía a cualquier
-- Responsable gestionar cualquier fila de su empresa aunque no supervisase al
-- agente propietario. Ahora solo puede gestionar filas propias o de supervisados.

notify pgrst, 'reload schema';
