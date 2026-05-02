-- Algunas bases existentes tienen columnas de agenda con varchar corto.
-- Las actividades usan valores como "visita" y "seguimiento", asi que
-- normalizamos a text sin tocar datos.
-- Hay que dropear politicas RLS que referencian visibility antes de cambiar el tipo.

drop policy if exists agenda_usuarios_select_scoped on public.agenda_usuarios;
drop policy if exists agenda_select_scoped on public.agenda;

alter table public.agenda
  alter column priority type text,
  alter column tipo type text,
  alter column visibility type text;

-- Recrear politicas
create policy agenda_select_scoped
on public.agenda
for select
using (
  archived_at is null
  and (
    public.can_access_scoped_row(owner_user_id, empresa_id, equipo_id, visibility)
    or public.is_agenda_assigned(id)
  )
);

create policy agenda_usuarios_select_scoped
on public.agenda_usuarios
for select
using (
  exists (
    select 1
    from public.agenda a
    where a.id = agenda_id
      and (
        public.can_access_scoped_row(a.owner_user_id, a.empresa_id, a.equipo_id, a.visibility)
        or usuario_id = public.current_usuario_id()
      )
  )
);

notify pgrst, 'reload schema';
