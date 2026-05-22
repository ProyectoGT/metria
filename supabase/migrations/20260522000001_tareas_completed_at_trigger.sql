-- Track when a task enters or leaves the completed state.
-- Safe/idempotent: keeps existing completed_at values and clears the timestamp on reopen.

alter table public.tareas
  add column if not exists completed_at timestamptz;

create or replace function public.set_tareas_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'completado' and old.estado is distinct from 'completado' then
    new.completed_at = coalesce(new.completed_at, now());
  elsif new.estado is distinct from 'completado' then
    new.completed_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tareas_completed_at on public.tareas;
create trigger trg_tareas_completed_at
  before update on public.tareas
  for each row
  execute function public.set_tareas_completed_at();

update public.tareas
set completed_at = coalesce(completed_at, updated_at, now())
where estado = 'completado'
  and completed_at is null;
