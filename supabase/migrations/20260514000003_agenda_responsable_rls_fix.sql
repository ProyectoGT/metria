-- Restaura la cláusula de Responsable en la policy de agenda.
--
-- Historia del problema:
--   20260503000009 añadió la cláusula de supervisados pero usaba
--   can_access_scoped_row() que causaba recursión infinita.
--   20260504000004 eliminó TODA la cláusula de Responsable para cortar
--   el ciclo, dejando a los Responsables sin visibilidad de sus supervisados.
--
-- Esta migración restaura la funcionalidad sin recursión:
--   - get_supervised_user_ids() es SECURITY DEFINER, lee solo 'usuarios'.
--     No toca 'agenda' ni 'agenda_usuarios' → sin ciclo.
--   - La policy de agenda_usuarios (20260504000004) solo llama a
--     current_usuario_id() y current_user_role() → tampoco lee 'agenda'.
--   - El EXISTS sobre agenda_usuarios es por tanto seguro.
--
-- Qué ve un Responsable tras esta migración:
--   - Propios (owner_user_id / user_id): ya cubierto por cláusulas anteriores
--   - Supervisados: owner_user_id, user_id o asignados via agenda_usuarios
--   - Company/team visibility: ya cubierto por cláusulas anteriores

drop policy if exists agenda_select_safe_no_recursion on public.agenda;

create policy agenda_select_safe_no_recursion
on public.agenda
for select
to authenticated
using (
  archived_at is null
  and (
    -- Administrador y Director: todos los eventos de su empresa
    (
      public.current_user_role() in ('Administrador', 'Director')
      and empresa_id = public.current_empresa_id()
    )
    -- Propietario del evento
    or owner_user_id = public.current_usuario_id()
    -- Usuario asignado directamente en el campo user_id
    or user_id = public.current_usuario_id()
    -- Visibilidad empresa: cualquier autenticado de la misma empresa
    or (
      visibility = 'company'
      and empresa_id = public.current_empresa_id()
    )
    -- Visibilidad equipo
    or (
      visibility = 'team'
      and empresa_id = public.current_empresa_id()
      and equipo_id = public.current_equipo_id()
    )
    -- Responsable: eventos de agentes bajo su supervisión directa.
    -- get_supervised_user_ids() es SECURITY DEFINER y lee solo 'usuarios'
    -- (WHERE supervisor_id = current_usuario_id()), nunca 'agenda' → sin recursión.
    -- El EXISTS sobre agenda_usuarios es seguro porque la policy de
    -- agenda_usuarios (creada en 20260504000004) no lee 'agenda'.
    or (
      public.current_user_role() = 'Responsable'
      and empresa_id = public.current_empresa_id()
      and (
        owner_user_id = any(select public.get_supervised_user_ids())
        or user_id = any(select public.get_supervised_user_ids())
        or exists (
          select 1 from public.agenda_usuarios au
          where au.agenda_id = agenda.id
            and au.usuario_id = any(select public.get_supervised_user_ids())
        )
      )
    )
  )
);

notify pgrst, 'reload schema';
