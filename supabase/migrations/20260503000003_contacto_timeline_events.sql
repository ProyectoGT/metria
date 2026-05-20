-- Timeline unificado por contacto/pedido.
-- Tabla aditiva: no modifica flujos existentes y permite registrar notas,
-- documentos, cambios de estado e interacciones comerciales.

create table if not exists public.contacto_timeline_events (
  id bigserial primary key,
  empresa_id bigint references public.empresas (id) on delete cascade,
  contacto_id bigint references public.contactos (id) on delete cascade,
  pedido_id bigint references public.pedidos (id) on delete cascade,
  propiedad_id bigint references public.propiedades (id) on delete set null,
  agente_id bigint references public.usuarios (id) on delete set null,
  tipo_evento varchar(50) not null,
  titulo text not null,
  descripcion text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint contacto_timeline_subject_check check (
    contacto_id is not null or pedido_id is not null
  )
);

create index if not exists idx_contacto_timeline_empresa_created
  on public.contacto_timeline_events (empresa_id, created_at desc);

create index if not exists idx_contacto_timeline_contacto_created
  on public.contacto_timeline_events (contacto_id, created_at desc)
  where contacto_id is not null;

create index if not exists idx_contacto_timeline_pedido_created
  on public.contacto_timeline_events (pedido_id, created_at desc)
  where pedido_id is not null;

create index if not exists idx_contacto_timeline_agente_created
  on public.contacto_timeline_events (agente_id, created_at desc);

create or replace function public.apply_contacto_timeline_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null then
    new.empresa_id := public.current_empresa_id();
  end if;

  if new.agente_id is null then
    new.agente_id := public.current_usuario_id();
  end if;

  if new.metadata is null then
    new.metadata := '{}'::jsonb;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_contacto_timeline_defaults on public.contacto_timeline_events;
create trigger trg_contacto_timeline_defaults
before insert on public.contacto_timeline_events
for each row execute function public.apply_contacto_timeline_defaults();

create or replace function public.can_access_contacto_timeline_event(
  row_empresa_id bigint,
  row_contacto_id bigint,
  row_pedido_id bigint,
  row_agente_id bigint
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
    when row_agente_id = public.current_usuario_id() then true
    when public.current_user_role() = 'Responsable'
      and (
        row_agente_id = public.current_usuario_id()
        or row_agente_id in (select * from public.get_supervised_user_ids())
      ) then true
    when row_contacto_id is not null and exists (
      select 1
      from public.contactos c
      where c.id = row_contacto_id
        and public.can_access_scoped_row(c.owner_user_id, c.empresa_id, c.equipo_id, c.visibility)
    ) then true
    when row_pedido_id is not null and exists (
      select 1
      from public.pedidos p
      where p.id = row_pedido_id
        and public.can_access_scoped_row(p.owner_user_id, p.empresa_id, p.equipo_id, p.visibility)
    ) then true
    else false
  end
$$;

create or replace function public.can_manage_contacto_timeline_event(
  row_empresa_id bigint,
  row_agente_id bigint
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
    when row_agente_id = public.current_usuario_id() then true
    when public.current_user_role() = 'Responsable'
      and row_agente_id in (select * from public.get_supervised_user_ids()) then true
    else false
  end
$$;

alter table public.contacto_timeline_events enable row level security;

drop policy if exists contacto_timeline_select_scoped on public.contacto_timeline_events;
create policy contacto_timeline_select_scoped
on public.contacto_timeline_events
for select
using (
  public.can_access_contacto_timeline_event(empresa_id, contacto_id, pedido_id, agente_id)
);

drop policy if exists contacto_timeline_insert_scoped on public.contacto_timeline_events;
create policy contacto_timeline_insert_scoped
on public.contacto_timeline_events
for insert
with check (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and (
    agente_id = public.current_usuario_id()
    or public.current_user_role() in ('Administrador', 'Director', 'Responsable')
  )
);

drop policy if exists contacto_timeline_update_scoped on public.contacto_timeline_events;
create policy contacto_timeline_update_scoped
on public.contacto_timeline_events
for update
using (public.can_manage_contacto_timeline_event(empresa_id, agente_id))
with check (
  empresa_id = public.current_empresa_id()
  and public.can_manage_contacto_timeline_event(empresa_id, agente_id)
);

drop policy if exists contacto_timeline_delete_scoped on public.contacto_timeline_events;
create policy contacto_timeline_delete_scoped
on public.contacto_timeline_events
for delete
using (public.can_manage_contacto_timeline_event(empresa_id, agente_id));

notify pgrst, 'reload schema';
