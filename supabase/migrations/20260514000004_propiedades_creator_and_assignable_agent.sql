-- Separa creador original de agente asignado en propiedades.
-- - created_by_user_id: auditoria inmutable de quien creo la propiedad.
-- - agente_asignado: agente operativo reasignable.

alter table public.propiedades
  add column if not exists created_by_user_id bigint references public.usuarios(id) on delete set null;

update public.propiedades
set created_by_user_id = coalesce(created_by_user_id, owner_user_id, agente_asignado)
where created_by_user_id is null;

create index if not exists propiedades_created_by_user_id_idx
  on public.propiedades (created_by_user_id)
  where created_by_user_id is not null;

create or replace function public.enforce_propiedades_creator_and_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
begin
  if tg_op = 'INSERT' then
    if new.created_by_user_id is null then
      new.created_by_user_id := public.current_usuario_id();
    end if;
  else
    new.created_by_user_id := old.created_by_user_id;
  end if;

  if new.agente_asignado is null then
    raise exception 'La propiedad debe tener un agente asignado.';
  end if;

  select rol into assigned_role
  from public.usuarios
  where id = new.agente_asignado;

  if assigned_role is null then
    raise exception 'El agente asignado no existe.';
  end if;

  if lower(translate(assigned_role, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) in ('administrador', 'admin', 'super_admin', 'super admin', 'superadministrador') then
    raise exception 'Los usuarios administradores no pueden tener propiedades asignadas.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_propiedades_creator_and_assignment on public.propiedades;
create trigger trg_propiedades_creator_and_assignment
before insert or update on public.propiedades
for each row execute function public.enforce_propiedades_creator_and_assignment();

drop policy if exists propiedades_select_scoped on public.propiedades;
create policy propiedades_select_scoped
on public.propiedades
for select
using (
  public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility)
  or (
    auth.uid() is not null
    and empresa_id = public.current_empresa_id()
    and (
      agente_asignado = public.current_usuario_id()
      or public.current_user_role() in ('Administrador', 'Director')
      or (
        public.current_user_role() = 'Responsable'
        and agente_asignado in (select public.get_supervised_user_ids())
      )
    )
  )
);

drop policy if exists propiedades_update_scoped on public.propiedades;
create policy propiedades_update_scoped
on public.propiedades
for update
using (
  public.can_manage_scoped_row(owner_user_id, empresa_id)
  or (
    auth.uid() is not null
    and empresa_id = public.current_empresa_id()
    and (
      agente_asignado = public.current_usuario_id()
      or public.current_user_role() in ('Administrador', 'Director')
      or (
        public.current_user_role() = 'Responsable'
        and agente_asignado in (select public.get_supervised_user_ids())
      )
    )
  )
)
with check (
  empresa_id = public.current_empresa_id()
  and (
    owner_user_id = public.current_usuario_id()
    or agente_asignado = public.current_usuario_id()
    or public.current_user_role() in ('Administrador', 'Director', 'Responsable')
  )
);

notify pgrst, 'reload schema';
