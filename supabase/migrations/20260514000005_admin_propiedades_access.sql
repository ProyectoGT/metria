-- Garantiza que Administrador pueda ver y gestionar propiedades sin depender
-- de agente_asignado ni de empresa_id, manteniendo la regla de no asignabilidad.

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(public.current_user_role(), '')) in (
    'administrador',
    'admin',
    'super_admin',
    'super admin',
    'superadministrador'
  )
$$;

drop policy if exists propiedades_select_scoped on public.propiedades;
create policy propiedades_select_scoped
on public.propiedades
for select
using (
  public.is_admin_role()
  or public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility)
  or (
    auth.uid() is not null
    and empresa_id = public.current_empresa_id()
    and (
      agente_asignado = public.current_usuario_id()
      or public.current_user_role() = 'Director'
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
  public.is_admin_role()
  or public.can_manage_scoped_row(owner_user_id, empresa_id)
  or (
    auth.uid() is not null
    and empresa_id = public.current_empresa_id()
    and (
      agente_asignado = public.current_usuario_id()
      or public.current_user_role() = 'Director'
      or (
        public.current_user_role() = 'Responsable'
        and agente_asignado in (select public.get_supervised_user_ids())
      )
    )
  )
)
with check (
  public.is_admin_role()
  or (
    empresa_id = public.current_empresa_id()
    and (
      owner_user_id = public.current_usuario_id()
      or agente_asignado = public.current_usuario_id()
      or public.current_user_role() in ('Director', 'Responsable')
    )
  )
);

drop policy if exists propiedades_insert_scoped on public.propiedades;
create policy propiedades_insert_scoped
on public.propiedades
for insert
with check (
  auth.uid() is not null
  and (
    public.is_admin_role()
    or (
      empresa_id = public.current_empresa_id()
      and owner_user_id = public.current_usuario_id()
    )
  )
);

drop policy if exists propiedades_delete_scoped on public.propiedades;
create policy propiedades_delete_scoped
on public.propiedades
for delete
using (
  public.is_admin_role()
  or public.can_manage_scoped_row(owner_user_id, empresa_id)
);

notify pgrst, 'reload schema';
