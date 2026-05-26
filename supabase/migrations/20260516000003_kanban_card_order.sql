create table if not exists public.kanban_card_orden (
  id bigserial primary key,
  user_id bigint not null references public.usuarios(id) on delete cascade,
  source text not null check (source in ('tarea', 'agenda')),
  db_id bigint not null,
  column_id text not null,
  posicion integer not null,
  updated_at timestamptz not null default now(),
  unique (user_id, source, db_id)
);

create index if not exists idx_kanban_card_orden_user_column
  on public.kanban_card_orden (user_id, column_id, posicion);

alter table public.kanban_card_orden enable row level security;

drop policy if exists kanban_card_orden_own on public.kanban_card_orden;
create policy kanban_card_orden_own
on public.kanban_card_orden
for all
to authenticated
using (user_id = public.current_usuario_id())
with check (user_id = public.current_usuario_id());

notify pgrst, 'reload schema';
