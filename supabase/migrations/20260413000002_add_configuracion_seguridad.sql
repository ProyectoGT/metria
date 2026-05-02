create table if not exists public.configuracion_seguridad (
  id bigint primary key,
  delete_confirmation_password_hash text,
  updated_by bigint references public.usuarios (id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.touch_configuracion_seguridad_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_configuracion_seguridad_updated_at on public.configuracion_seguridad;

create trigger trg_configuracion_seguridad_updated_at
before update on public.configuracion_seguridad
for each row
execute function public.touch_configuracion_seguridad_updated_at();

insert into public.configuracion_seguridad (id)
values (1)
on conflict (id) do nothing;
