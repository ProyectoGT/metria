-- Commercial history cycles for physical properties.
-- Keeps propiedades as the physical property and tracks each commercial cycle
-- separately, including sale records and state transitions.

create table if not exists public.propiedad_ciclos_comerciales (
  id bigserial primary key,
  propiedad_id bigint not null references public.propiedades (id) on delete cascade,
  empresa_id bigint references public.empresas (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'closed')),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_reason text
    check (closed_reason is null or closed_reason in ('sold', 'archived', 'discarded', 'other')),
  opened_by_user_id bigint references public.usuarios (id) on delete set null,
  closed_by_user_id bigint references public.usuarios (id) on delete set null,
  initial_status text,
  final_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists propiedad_ciclos_active_unique
  on public.propiedad_ciclos_comerciales (propiedad_id)
  where status = 'active';

create index if not exists propiedad_ciclos_propiedad_idx
  on public.propiedad_ciclos_comerciales (propiedad_id);

create index if not exists propiedad_ciclos_empresa_status_idx
  on public.propiedad_ciclos_comerciales (empresa_id, status);

alter table public.propiedades
  add column if not exists current_commercial_cycle_id bigint null,
  add column if not exists has_sale_history boolean not null default false,
  add column if not exists last_sold_at timestamptz null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'propiedades_current_commercial_cycle_id_fkey'
  ) then
    alter table public.propiedades
      add constraint propiedades_current_commercial_cycle_id_fkey
      foreign key (current_commercial_cycle_id)
      references public.propiedad_ciclos_comerciales (id)
      on delete set null;
  end if;
end;
$$;

create index if not exists propiedades_current_commercial_cycle_idx
  on public.propiedades (current_commercial_cycle_id)
  where current_commercial_cycle_id is not null;

create index if not exists propiedades_has_sale_history_idx
  on public.propiedades (has_sale_history)
  where has_sale_history = true;

create index if not exists propiedades_last_sold_at_idx
  on public.propiedades (last_sold_at)
  where last_sold_at is not null;

create table if not exists public.propiedad_estado_historial (
  id bigserial primary key,
  propiedad_id bigint not null references public.propiedades (id) on delete cascade,
  ciclo_comercial_id bigint references public.propiedad_ciclos_comerciales (id) on delete set null,
  empresa_id bigint references public.empresas (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by_user_id bigint references public.usuarios (id) on delete set null,
  changed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists propiedad_estado_historial_propiedad_idx
  on public.propiedad_estado_historial (propiedad_id, changed_at desc);

create index if not exists propiedad_estado_historial_ciclo_idx
  on public.propiedad_estado_historial (ciclo_comercial_id);

create index if not exists propiedad_estado_historial_changed_at_idx
  on public.propiedad_estado_historial (changed_at desc);

create table if not exists public.propiedad_registros_venta (
  id bigserial primary key,
  propiedad_id bigint not null references public.propiedades (id) on delete cascade,
  ciclo_comercial_id bigint references public.propiedad_ciclos_comerciales (id) on delete set null,
  empresa_id bigint references public.empresas (id) on delete cascade,
  sold_at timestamptz,
  sold_by_user_id bigint references public.usuarios (id) on delete set null,
  sale_price numeric,
  commission_amount numeric,
  buyer_name text,
  buyer_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists propiedad_registros_venta_propiedad_idx
  on public.propiedad_registros_venta (propiedad_id, sold_at desc);

create index if not exists propiedad_registros_venta_ciclo_idx
  on public.propiedad_registros_venta (ciclo_comercial_id);

create index if not exists propiedad_registros_venta_sold_at_idx
  on public.propiedad_registros_venta (sold_at desc)
  where sold_at is not null;

alter table public.archivos
  add column if not exists ciclo_comercial_id bigint references public.propiedad_ciclos_comerciales (id) on delete set null;

alter table public.encargo_visitas
  add column if not exists ciclo_comercial_id bigint references public.propiedad_ciclos_comerciales (id) on delete set null;

alter table public.encargo_notas
  add column if not exists ciclo_comercial_id bigint references public.propiedad_ciclos_comerciales (id) on delete set null;

alter table public.documentos_generados
  add column if not exists ciclo_comercial_id bigint references public.propiedad_ciclos_comerciales (id) on delete set null;

alter table public.contacto_timeline_events
  add column if not exists ciclo_comercial_id bigint references public.propiedad_ciclos_comerciales (id) on delete set null;

create index if not exists archivos_ciclo_comercial_idx
  on public.archivos (ciclo_comercial_id)
  where ciclo_comercial_id is not null;

create index if not exists encargo_visitas_ciclo_comercial_idx
  on public.encargo_visitas (ciclo_comercial_id)
  where ciclo_comercial_id is not null;

create index if not exists encargo_notas_ciclo_comercial_idx
  on public.encargo_notas (ciclo_comercial_id)
  where ciclo_comercial_id is not null;

create index if not exists documentos_generados_ciclo_comercial_idx
  on public.documentos_generados (ciclo_comercial_id)
  where ciclo_comercial_id is not null;

create index if not exists contacto_timeline_ciclo_comercial_idx
  on public.contacto_timeline_events (ciclo_comercial_id)
  where ciclo_comercial_id is not null;

create or replace function public.touch_propiedad_cycle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_propiedad_ciclos_updated_at on public.propiedad_ciclos_comerciales;
create trigger trg_propiedad_ciclos_updated_at
before update on public.propiedad_ciclos_comerciales
for each row execute function public.touch_propiedad_cycle_updated_at();

drop trigger if exists trg_propiedad_registros_venta_updated_at on public.propiedad_registros_venta;
create trigger trg_propiedad_registros_venta_updated_at
before update on public.propiedad_registros_venta
for each row execute function public.touch_propiedad_cycle_updated_at();

create or replace function public.can_access_propiedad_for_cycles(row_propiedad_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.propiedades p
    where p.id = row_propiedad_id
      and (
        public.is_admin_role()
        or (
          auth.uid() is not null
          and p.empresa_id = public.current_empresa_id()
          and (
            public.current_user_role() = 'Director'
            or p.owner_user_id = public.current_usuario_id()
            or p.agente_asignado = public.current_usuario_id()
            or (
              public.current_user_role() = 'Responsable'
              and (
                p.owner_user_id in (select public.get_supervised_user_ids())
                or p.agente_asignado in (select public.get_supervised_user_ids())
              )
            )
          )
        )
      )
  )
$$;

create or replace function public.can_manage_propiedad_for_cycles(row_propiedad_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.propiedades p
    where p.id = row_propiedad_id
      and (
        public.is_admin_role()
        or (
          auth.uid() is not null
          and p.empresa_id = public.current_empresa_id()
          and (
            public.current_user_role() = 'Director'
            or p.owner_user_id = public.current_usuario_id()
            or p.agente_asignado = public.current_usuario_id()
            or (
              public.current_user_role() = 'Responsable'
              and (
                p.owner_user_id in (select public.get_supervised_user_ids())
                or p.agente_asignado in (select public.get_supervised_user_ids())
              )
            )
          )
        )
      )
  )
$$;

alter table public.propiedad_ciclos_comerciales enable row level security;
alter table public.propiedad_estado_historial enable row level security;
alter table public.propiedad_registros_venta enable row level security;

drop policy if exists propiedad_ciclos_select on public.propiedad_ciclos_comerciales;
create policy propiedad_ciclos_select
on public.propiedad_ciclos_comerciales for select
using (public.can_access_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_ciclos_insert on public.propiedad_ciclos_comerciales;
create policy propiedad_ciclos_insert
on public.propiedad_ciclos_comerciales for insert
with check (public.can_manage_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_ciclos_update on public.propiedad_ciclos_comerciales;
create policy propiedad_ciclos_update
on public.propiedad_ciclos_comerciales for update
using (public.can_manage_propiedad_for_cycles(propiedad_id))
with check (public.can_manage_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_ciclos_delete on public.propiedad_ciclos_comerciales;
create policy propiedad_ciclos_delete
on public.propiedad_ciclos_comerciales for delete
using (public.can_manage_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_estado_historial_select on public.propiedad_estado_historial;
create policy propiedad_estado_historial_select
on public.propiedad_estado_historial for select
using (public.can_access_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_estado_historial_insert on public.propiedad_estado_historial;
create policy propiedad_estado_historial_insert
on public.propiedad_estado_historial for insert
with check (public.can_manage_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_estado_historial_delete on public.propiedad_estado_historial;
create policy propiedad_estado_historial_delete
on public.propiedad_estado_historial for delete
using (public.can_manage_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_registros_venta_select on public.propiedad_registros_venta;
create policy propiedad_registros_venta_select
on public.propiedad_registros_venta for select
using (public.can_access_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_registros_venta_insert on public.propiedad_registros_venta;
create policy propiedad_registros_venta_insert
on public.propiedad_registros_venta for insert
with check (public.can_manage_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_registros_venta_update on public.propiedad_registros_venta;
create policy propiedad_registros_venta_update
on public.propiedad_registros_venta for update
using (public.can_manage_propiedad_for_cycles(propiedad_id))
with check (public.can_manage_propiedad_for_cycles(propiedad_id));

drop policy if exists propiedad_registros_venta_delete on public.propiedad_registros_venta;
create policy propiedad_registros_venta_delete
on public.propiedad_registros_venta for delete
using (public.can_manage_propiedad_for_cycles(propiedad_id));

-- Backfill: desactivar triggers en propiedades durante las actualizaciones masivas
-- para no disparar validaciones de negocio (agente_asignado, etc.)
set session_replication_role = 'replica';

-- Backfill one commercial cycle per existing property.
insert into public.propiedad_ciclos_comerciales (
  propiedad_id,
  empresa_id,
  status,
  started_at,
  closed_at,
  closed_reason,
  opened_by_user_id,
  closed_by_user_id,
  initial_status,
  final_status
)
select
  p.id,
  p.empresa_id,
  case when lower(coalesce(p.estado, '')) = 'vendido' then 'closed' else 'active' end,
  coalesce(p.created_at, now()),
  case when lower(coalesce(p.estado, '')) = 'vendido' then coalesce(p.updated_at, p.created_at) else null end,
  case when lower(coalesce(p.estado, '')) = 'vendido' then 'sold' else null end,
  coalesce(p.created_by_user_id, p.owner_user_id, p.agente_asignado),
  case when lower(coalesce(p.estado, '')) = 'vendido' then coalesce(p.agente_asignado, p.owner_user_id, p.created_by_user_id) else null end,
  coalesce(p.estado, 'neutral'),
  case when lower(coalesce(p.estado, '')) = 'vendido' then p.estado else null end
from public.propiedades p
where not exists (
  select 1
  from public.propiedad_ciclos_comerciales c
  where c.propiedad_id = p.id
);

update public.propiedades p
set current_commercial_cycle_id = c.id,
    has_sale_history = case when lower(coalesce(p.estado, '')) = 'vendido' then true else p.has_sale_history end,
    last_sold_at = case when lower(coalesce(p.estado, '')) = 'vendido' then coalesce(p.updated_at, p.created_at) else p.last_sold_at end
from public.propiedad_ciclos_comerciales c
where c.propiedad_id = p.id
  and p.current_commercial_cycle_id is null
  and c.id = (
    select c2.id
    from public.propiedad_ciclos_comerciales c2
    where c2.propiedad_id = p.id
    order by c2.created_at desc, c2.id desc
    limit 1
  );

insert into public.propiedad_estado_historial (
  propiedad_id,
  ciclo_comercial_id,
  empresa_id,
  from_status,
  to_status,
  changed_by_user_id,
  changed_at,
  notes
)
select
  p.id,
  p.current_commercial_cycle_id,
  p.empresa_id,
  null,
  coalesce(p.estado, 'neutral'),
  coalesce(p.created_by_user_id, p.owner_user_id, p.agente_asignado),
  coalesce(p.created_at, now()),
  'Backfill inicial'
from public.propiedades p
where not exists (
  select 1
  from public.propiedad_estado_historial h
  where h.propiedad_id = p.id
);

insert into public.propiedad_registros_venta (
  propiedad_id,
  ciclo_comercial_id,
  empresa_id,
  sold_at,
  sold_by_user_id,
  sale_price,
  commission_amount,
  notes
)
select
  p.id,
  p.current_commercial_cycle_id,
  p.empresa_id,
  coalesce(p.updated_at, p.created_at),
  coalesce(p.agente_asignado, p.owner_user_id, p.created_by_user_id),
  p.precio,
  p.honorarios,
  'Registro de venta creado por migracion'
from public.propiedades p
where lower(coalesce(p.estado, '')) = 'vendido'
  and not exists (
    select 1
    from public.propiedad_registros_venta v
    where v.propiedad_id = p.id
  );

update public.archivos a
set ciclo_comercial_id = p.current_commercial_cycle_id
from public.propiedades p
where a.propiedad_id = p.id
  and a.ciclo_comercial_id is null;

update public.encargo_visitas v
set ciclo_comercial_id = p.current_commercial_cycle_id
from public.propiedades p
where v.propiedad_id = p.id
  and v.ciclo_comercial_id is null;

update public.encargo_notas n
set ciclo_comercial_id = p.current_commercial_cycle_id
from public.propiedades p
where n.propiedad_id = p.id
  and n.ciclo_comercial_id is null;

update public.documentos_generados d
set ciclo_comercial_id = p.current_commercial_cycle_id
from public.propiedades p
where d.propiedad_id = p.id
  and d.ciclo_comercial_id is null;

update public.contacto_timeline_events e
set ciclo_comercial_id = p.current_commercial_cycle_id
from public.propiedades p
where e.propiedad_id = p.id
  and e.ciclo_comercial_id is null;

-- Restaurar comportamiento normal de triggers
set session_replication_role = 'origin';

create or replace function public.default_ciclo_comercial_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_cycle_id bigint;
begin
  if new.ciclo_comercial_id is null and new.propiedad_id is not null then
    select p.current_commercial_cycle_id
    into active_cycle_id
    from public.propiedades p
    where p.id = new.propiedad_id;

    new.ciclo_comercial_id := active_cycle_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_archivos_default_ciclo on public.archivos;
create trigger trg_archivos_default_ciclo
before insert on public.archivos
for each row execute function public.default_ciclo_comercial_id();

drop trigger if exists trg_encargo_visitas_default_ciclo on public.encargo_visitas;
create trigger trg_encargo_visitas_default_ciclo
before insert on public.encargo_visitas
for each row execute function public.default_ciclo_comercial_id();

drop trigger if exists trg_encargo_notas_default_ciclo on public.encargo_notas;
create trigger trg_encargo_notas_default_ciclo
before insert on public.encargo_notas
for each row execute function public.default_ciclo_comercial_id();

drop trigger if exists trg_documentos_generados_default_ciclo on public.documentos_generados;
create trigger trg_documentos_generados_default_ciclo
before insert on public.documentos_generados
for each row execute function public.default_ciclo_comercial_id();

drop trigger if exists trg_contacto_timeline_default_ciclo on public.contacto_timeline_events;
create trigger trg_contacto_timeline_default_ciclo
before insert on public.contacto_timeline_events
for each row execute function public.default_ciclo_comercial_id();

create or replace function public.ensure_propiedad_cycle_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_cycle_id bigint;
  sold_at_value timestamptz;
begin
  if new.current_commercial_cycle_id is not null then
    return new;
  end if;

  sold_at_value := case
    when lower(coalesce(new.estado, '')) = 'vendido' then coalesce(new.updated_at, new.created_at, now())
    else null
  end;

  insert into public.propiedad_ciclos_comerciales (
    propiedad_id,
    empresa_id,
    status,
    started_at,
    closed_at,
    closed_reason,
    opened_by_user_id,
    closed_by_user_id,
    initial_status,
    final_status
  )
  values (
    new.id,
    new.empresa_id,
    case when sold_at_value is not null then 'closed' else 'active' end,
    coalesce(new.created_at, now()),
    sold_at_value,
    case when sold_at_value is not null then 'sold' else null end,
    coalesce(new.created_by_user_id, new.owner_user_id, new.agente_asignado),
    case when sold_at_value is not null then coalesce(new.agente_asignado, new.owner_user_id, new.created_by_user_id) else null end,
    coalesce(new.estado, 'neutral'),
    case when sold_at_value is not null then new.estado else null end
  )
  returning id into new_cycle_id;

  insert into public.propiedad_estado_historial (
    propiedad_id,
    ciclo_comercial_id,
    empresa_id,
    from_status,
    to_status,
    changed_by_user_id,
    changed_at,
    notes
  )
  values (
    new.id,
    new_cycle_id,
    new.empresa_id,
    null,
    coalesce(new.estado, 'neutral'),
    coalesce(new.created_by_user_id, new.owner_user_id, new.agente_asignado),
    coalesce(new.created_at, now()),
    'Ciclo inicial'
  );

  update public.propiedades
  set current_commercial_cycle_id = new_cycle_id,
      has_sale_history = case when sold_at_value is not null then true else has_sale_history end,
      last_sold_at = case when sold_at_value is not null then sold_at_value else last_sold_at end
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_propiedades_ensure_cycle on public.propiedades;
create trigger trg_propiedades_ensure_cycle
after insert on public.propiedades
for each row execute function public.ensure_propiedad_cycle_on_insert();

create or replace function public.transition_propiedad_commercial_status(
  p_propiedad_id bigint,
  p_next_status text,
  p_notes text default null,
  p_sold_at timestamptz default null,
  p_sale_price numeric default null,
  p_commission_amount numeric default null,
  p_buyer_name text default null,
  p_buyer_phone text default null
)
returns public.propiedades
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_row public.propiedades%rowtype;
  old_status text;
  next_status text;
  cycle_id bigint;
  transition_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  next_status := nullif(trim(p_next_status), '');
  if next_status is null then
    raise exception 'Estado destino requerido';
  end if;

  select *
  into prop_row
  from public.propiedades
  where id = p_propiedad_id
  for update;

  if not found then
    raise exception 'Propiedad no encontrada';
  end if;

  if not public.can_manage_propiedad_for_cycles(p_propiedad_id) then
    raise exception 'Sin permiso para cambiar el estado de esta propiedad';
  end if;

  old_status := coalesce(prop_row.estado, 'neutral');
  transition_at := coalesce(p_sold_at, now());

  if lower(next_status) = 'vendido' then
    cycle_id := prop_row.current_commercial_cycle_id;

    if cycle_id is null or not exists (
      select 1 from public.propiedad_ciclos_comerciales
      where id = cycle_id and propiedad_id = prop_row.id
    ) then
      insert into public.propiedad_ciclos_comerciales (
        propiedad_id,
        empresa_id,
        status,
        started_at,
        opened_by_user_id,
        initial_status
      )
      values (
        prop_row.id,
        prop_row.empresa_id,
        'active',
        now(),
        public.current_usuario_id(),
        old_status
      )
      returning id into cycle_id;
    end if;

    update public.propiedad_ciclos_comerciales
    set status = 'closed',
        closed_at = transition_at,
        closed_reason = 'sold',
        closed_by_user_id = public.current_usuario_id(),
        final_status = next_status
    where id = cycle_id;

    insert into public.propiedad_registros_venta (
      propiedad_id,
      ciclo_comercial_id,
      empresa_id,
      sold_at,
      sold_by_user_id,
      sale_price,
      commission_amount,
      buyer_name,
      buyer_phone,
      notes
    )
    values (
      prop_row.id,
      cycle_id,
      prop_row.empresa_id,
      transition_at,
      public.current_usuario_id(),
      p_sale_price,
      p_commission_amount,
      nullif(trim(coalesce(p_buyer_name, '')), ''),
      nullif(trim(coalesce(p_buyer_phone, '')), ''),
      p_notes
    );

    insert into public.propiedad_estado_historial (
      propiedad_id,
      ciclo_comercial_id,
      empresa_id,
      from_status,
      to_status,
      changed_by_user_id,
      changed_at,
      notes
    )
    values (
      prop_row.id,
      cycle_id,
      prop_row.empresa_id,
      old_status,
      next_status,
      public.current_usuario_id(),
      transition_at,
      p_notes
    );

    update public.propiedades
    set estado = next_status,
        current_commercial_cycle_id = cycle_id,
        has_sale_history = true,
        last_sold_at = transition_at,
        honorarios = p_commission_amount,
        updated_at = now()
    where id = prop_row.id
    returning * into prop_row;

    return prop_row;
  end if;

  if lower(old_status) = 'vendido' then
    update public.propiedad_ciclos_comerciales
    set status = 'closed',
        closed_at = coalesce(closed_at, now()),
        closed_reason = coalesce(closed_reason, 'other'),
        closed_by_user_id = coalesce(closed_by_user_id, public.current_usuario_id()),
        final_status = coalesce(final_status, old_status)
    where propiedad_id = prop_row.id
      and status = 'active';

    insert into public.propiedad_ciclos_comerciales (
      propiedad_id,
      empresa_id,
      status,
      started_at,
      opened_by_user_id,
      initial_status
    )
    values (
      prop_row.id,
      prop_row.empresa_id,
      'active',
      now(),
      public.current_usuario_id(),
      next_status
    )
    returning id into cycle_id;

    insert into public.propiedad_estado_historial (
      propiedad_id,
      ciclo_comercial_id,
      empresa_id,
      from_status,
      to_status,
      changed_by_user_id,
      changed_at,
      notes
    )
    values (
      prop_row.id,
      cycle_id,
      prop_row.empresa_id,
      old_status,
      next_status,
      public.current_usuario_id(),
      now(),
      p_notes
    );

    update public.propiedades
    set estado = next_status,
        current_commercial_cycle_id = cycle_id,
        has_sale_history = true,
        honorarios = null,
        updated_at = now()
    where id = prop_row.id
    returning * into prop_row;

    return prop_row;
  end if;

  cycle_id := prop_row.current_commercial_cycle_id;
  if cycle_id is null or not exists (
    select 1 from public.propiedad_ciclos_comerciales
    where id = cycle_id and propiedad_id = prop_row.id and status = 'active'
  ) then
    insert into public.propiedad_ciclos_comerciales (
      propiedad_id,
      empresa_id,
      status,
      started_at,
      opened_by_user_id,
      initial_status
    )
    values (
      prop_row.id,
      prop_row.empresa_id,
      'active',
      now(),
      public.current_usuario_id(),
      old_status
    )
    returning id into cycle_id;
  end if;

  if old_status is distinct from next_status then
    insert into public.propiedad_estado_historial (
      propiedad_id,
      ciclo_comercial_id,
      empresa_id,
      from_status,
      to_status,
      changed_by_user_id,
      changed_at,
      notes
    )
    values (
      prop_row.id,
      cycle_id,
      prop_row.empresa_id,
      old_status,
      next_status,
      public.current_usuario_id(),
      now(),
      p_notes
    );
  end if;

  update public.propiedades
  set estado = next_status,
      current_commercial_cycle_id = cycle_id,
      updated_at = now()
  where id = prop_row.id
  returning * into prop_row;

  return prop_row;
end;
$$;

grant execute on function public.transition_propiedad_commercial_status(
  bigint,
  text,
  text,
  timestamptz,
  numeric,
  numeric,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';
