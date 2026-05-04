drop policy if exists agenda_select_scoped on public.agenda;
drop policy if exists agenda_usuarios_select_scoped on public.agenda_usuarios;

drop policy if exists agenda_select_safe_no_recursion on public.agenda;
drop policy if exists agenda_usuarios_select_safe_no_recursion on public.agenda_usuarios;

create policy agenda_select_safe_no_recursion
on public.agenda
for select
to authenticated
using (
  archived_at is null
  and (
    (
      public.current_user_role() in ('Administrador', 'Director')
      and empresa_id = public.current_empresa_id()
    )
    or (
      public.current_user_role() = 'Responsable'
      and empresa_id = public.current_empresa_id()
    )
    or owner_user_id = public.current_usuario_id()
    or user_id = public.current_usuario_id()
    or (
      visibility = 'company'
      and empresa_id = public.current_empresa_id()
    )
    or (
      visibility = 'team'
      and empresa_id = public.current_empresa_id()
      and equipo_id = public.current_equipo_id()
    )
  )
);

create policy agenda_usuarios_select_safe_no_recursion
on public.agenda_usuarios
for select
to authenticated
using (
  usuario_id = public.current_usuario_id()
  or public.current_user_role() in ('Administrador', 'Director', 'Responsable')
);

notify pgrst, 'reload schema';
