-- Colaboraciones entre agentes sobre pedidos, propiedades o contactos.
-- El owner invita a un colaborador; el colaborador acepta/rechaza.
-- No modifica permisos sobre la entidad: es una capa de coordinación.

create table if not exists public.colaboraciones (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas (id) on delete cascade,

  -- Entidad sobre la que se colabora
  entidad_tipo varchar(20) not null,      -- 'pedido' | 'propiedad' | 'contacto'
  entidad_id   bigint not null,

  -- Partes
  agente_owner_id       bigint not null references public.usuarios (id) on delete cascade,
  agente_colaborador_id bigint not null references public.usuarios (id) on delete cascade,

  -- Ciclo de vida
  estado varchar(20) not null default 'pendiente',  -- pendiente | aceptada | rechazada | cancelada

  -- Condiciones opcionales
  porcentaje_comision numeric(5,2),   -- ej. 30.00 = 30%
  notas text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint colaboracion_estado_check check (
    estado in ('pendiente', 'aceptada', 'rechazada', 'cancelada')
  ),
  constraint colaboracion_entidad_tipo_check check (
    entidad_tipo in ('pedido', 'propiedad', 'contacto')
  ),
  -- Un colaborador no puede ser el mismo que el owner
  constraint colaboracion_distintos_agentes check (
    agente_owner_id <> agente_colaborador_id
  ),
  -- Una sola colaboración activa (pendiente/aceptada) por par owner+colaborador+entidad
  constraint colaboracion_unique_activa unique nulls not distinct (
    empresa_id, entidad_tipo, entidad_id, agente_owner_id, agente_colaborador_id
  )
);

create index if not exists idx_colab_owner
  on public.colaboraciones (agente_owner_id, estado);

create index if not exists idx_colab_colaborador
  on public.colaboraciones (agente_colaborador_id, estado);

create index if not exists idx_colab_entidad
  on public.colaboraciones (entidad_tipo, entidad_id, empresa_id);

-- Trigger: rellena empresa_id y updated_at
create or replace function public.apply_colaboracion_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null then
    new.empresa_id := public.current_empresa_id();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_colaboracion_defaults on public.colaboraciones;
create trigger trg_colaboracion_defaults
before insert or update on public.colaboraciones
for each row execute function public.apply_colaboracion_defaults();

-- ─── Función de acceso ─────────────────────────────────────────────────────────

create or replace function public.can_access_colaboracion(
  row_empresa_id       bigint,
  row_owner_id         bigint,
  row_colaborador_id   bigint
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
    when public.current_user_role() in ('Administrador', 'Director') then true
    when row_owner_id = public.current_usuario_id() then true
    when row_colaborador_id = public.current_usuario_id() then true
    when public.current_user_role() = 'Responsable'
      and (
        row_owner_id in (select * from public.get_supervised_user_ids())
        or row_colaborador_id in (select * from public.get_supervised_user_ids())
      ) then true
    else false
  end
$$;

create or replace function public.can_manage_colaboracion(
  row_empresa_id bigint,
  row_owner_id   bigint
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
    when public.current_user_role() in ('Administrador', 'Director') then true
    when row_owner_id = public.current_usuario_id() then true
    else false
  end
$$;

-- ─── RLS ───────────────────────────────────────────────────────────────────────

alter table public.colaboraciones enable row level security;

drop policy if exists colaboracion_select on public.colaboraciones;
create policy colaboracion_select
on public.colaboraciones for select
using (public.can_access_colaboracion(empresa_id, agente_owner_id, agente_colaborador_id));

drop policy if exists colaboracion_insert on public.colaboraciones;
create policy colaboracion_insert
on public.colaboraciones for insert
with check (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and agente_owner_id = public.current_usuario_id()
);

-- El owner puede cancelar; el colaborador puede aceptar/rechazar su propia invitación
drop policy if exists colaboracion_update on public.colaboraciones;
create policy colaboracion_update
on public.colaboraciones for update
using (
  empresa_id = public.current_empresa_id()
  and (
    agente_owner_id = public.current_usuario_id()
    or agente_colaborador_id = public.current_usuario_id()
    or public.current_user_role() in ('Administrador', 'Director')
  )
)
with check (empresa_id = public.current_empresa_id());

notify pgrst, 'reload schema';
