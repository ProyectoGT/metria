-- Respeta el alcance granular de solicitudes:
-- - agents/responsable usan visibility_agente_ids
-- - private/team/company mantienen el comportamiento scoped existente

alter table public.pedidos
  drop constraint if exists pedidos_visibility_check;

alter table public.pedidos
  add constraint pedidos_visibility_check
  check (visibility in ('private', 'team', 'company', 'agents', 'responsable'));

create or replace function public.can_access_pedido(
  row_owner_user_id bigint,
  row_empresa_id bigint,
  row_equipo_id bigint,
  row_visibility text,
  row_visibility_agente_ids integer[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.is_admin_or_director() and row_empresa_id = public.current_empresa_id() then true
    when row_owner_user_id = public.current_usuario_id() then true
    when row_visibility = 'company' and row_empresa_id = public.current_empresa_id() then true
    when row_visibility = 'team'
      and row_empresa_id = public.current_empresa_id()
      and row_equipo_id = public.current_equipo_id() then true
    when row_visibility = 'agents'
      and row_empresa_id = public.current_empresa_id()
      and (
        coalesce(array_length(row_visibility_agente_ids, 1), 0) = 0
          and public.current_user_role() = 'Agente'
        or public.current_usuario_id() = any(row_visibility_agente_ids)
      ) then true
    when row_visibility = 'responsable'
      and row_empresa_id = public.current_empresa_id()
      and (
        coalesce(array_length(row_visibility_agente_ids, 1), 0) = 0
          and public.current_user_role() = 'Responsable'
        or public.current_usuario_id() = any(row_visibility_agente_ids)
      ) then true
    else false
  end
$$;

drop policy if exists pedidos_select_scoped on public.pedidos;
create policy pedidos_select_scoped
on public.pedidos
for select
using (
  public.can_access_pedido(
    owner_user_id,
    empresa_id,
    equipo_id,
    visibility,
    visibility_agente_ids
  )
);

notify pgrst, 'reload schema';
