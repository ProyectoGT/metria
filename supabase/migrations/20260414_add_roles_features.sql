-- ============================================================
-- 1. supervisor_id en usuarios (relación Responsable → Agente)
-- ============================================================
alter table public.usuarios
  add column if not exists supervisor_id bigint
  references public.usuarios (id) on delete set null;

-- ============================================================
-- 2. fecha en tareas (para agrupar por día en Órdenes del día)
-- ============================================================
alter table public.tareas
  add column if not exists fecha date;

-- ============================================================
-- 3. Función: IDs de agentes supervisados por el usuario actual
-- ============================================================
create or replace function public.get_supervised_user_ids()
returns setof bigint
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.usuarios
  where supervisor_id = public.current_usuario_id()
$$;

-- ============================================================
-- 4. RLS tareas SELECT: Responsable ve también las de sus supervisados
-- ============================================================
drop policy if exists tareas_select_scoped on public.tareas;

create policy tareas_select_scoped
on public.tareas
for select
using (
  public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility)
  or (
    auth.uid() is not null
    and public.current_user_role() = 'Responsable'
    and owner_user_id in (select public.get_supervised_user_ids())
    and empresa_id = public.current_empresa_id()
  )
);
