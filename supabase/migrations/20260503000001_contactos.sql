-- Módulo Contactos: personas/entidades externas relacionadas con la inmobiliaria.
-- NO son usuarios internos del CRM (tabla usuarios).
-- Uso el mismo patrón de acceso scoped que agenda/pedidos/tareas.

-- ─── Tabla ────────────────────────────────────────────────────────────────────

create table if not exists public.contactos (
  id            bigserial primary key,
  nombre        text        not null,
  apellidos     text,
  empresa       text,
  cargo         text,
  tipo          text        not null default 'otro',
  email         text,
  telefono      text,
  telefono_secundario text,
  direccion     text,
  ciudad        text,
  provincia     text,
  codigo_postal text,
  pais          text        not null default 'España',
  notas         text,
  origen        text,
  estado        text        not null default 'activo',
  owner_user_id bigint      references public.usuarios(id) on delete set null,
  empresa_id    bigint      references public.empresas(id) on delete set null,
  equipo_id     bigint      references public.equipos(id)  on delete set null,
  visibility    text        not null default 'company',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz,

  constraint contactos_tipo_check check (tipo in (
    'cliente','propietario','comprador','inquilino',
    'colaborador','proveedor','abogado','notario',
    'banco','administrador_fincas','reformista','arquitecto','otro'
  )),
  constraint contactos_estado_check check (estado in ('activo','inactivo')),
  constraint contactos_visibility_check check (visibility in ('private','team','company'))
);

-- ─── Trigger: updated_at ──────────────────────────────────────────────────────

create or replace function public.set_contactos_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contactos_updated_at on public.contactos;
create trigger contactos_updated_at
  before update on public.contactos
  for each row execute function public.set_contactos_updated_at();

-- ─── Trigger: asignar scope por defecto al crear ──────────────────────────────
-- Reutiliza apply_default_access_scope() definida en la migración de acceso.

drop trigger if exists trg_contactos_default_access_scope on public.contactos;
create trigger trg_contactos_default_access_scope
  before insert on public.contactos
  for each row execute function public.apply_default_access_scope();

-- ─── Índices ──────────────────────────────────────────────────────────────────

create index if not exists idx_contactos_empresa_id
  on public.contactos(empresa_id) where archived_at is null;

create index if not exists idx_contactos_owner_user_id
  on public.contactos(owner_user_id) where archived_at is null;

create index if not exists idx_contactos_tipo
  on public.contactos(tipo) where archived_at is null;

create index if not exists idx_contactos_estado
  on public.contactos(estado) where archived_at is null;

create index if not exists idx_contactos_email
  on public.contactos(email) where email is not null;

create index if not exists idx_contactos_telefono
  on public.contactos(telefono) where telefono is not null;

create index if not exists idx_contactos_archived_at
  on public.contactos(archived_at) where archived_at is not null;

create index if not exists idx_contactos_nombre
  on public.contactos(nombre) where archived_at is null;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table public.contactos enable row level security;

-- SELECT: visibilidad gestionada por can_access_scoped_row
drop policy if exists contactos_select on public.contactos;
create policy contactos_select on public.contactos for select
using (
  archived_at is null
  and public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility)
);

-- INSERT: cualquier usuario autenticado puede crear (apply_default_access_scope
-- asigna empresa_id/owner_user_id/equipo_id automáticamente antes del check)
drop policy if exists contactos_insert on public.contactos;
create policy contactos_insert on public.contactos for insert
with check (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
);

-- UPDATE: propietario o manager
drop policy if exists contactos_update on public.contactos;
create policy contactos_update on public.contactos for update
using (
  public.can_manage_scoped_row(owner_user_id, empresa_id)
)
with check (
  empresa_id = public.current_empresa_id()
);

-- DELETE: no habilitado en la UI (usamos archived_at).
-- Solo Administrador puede borrar físicamente si fuera necesario desde Supabase Studio.
drop policy if exists contactos_delete on public.contactos;
create policy contactos_delete on public.contactos for delete
using (
  public.current_user_role() = 'Administrador'
  and empresa_id = public.current_empresa_id()
);
