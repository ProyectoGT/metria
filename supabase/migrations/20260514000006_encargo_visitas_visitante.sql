alter table public.encargo_visitas
  add column if not exists visitante_nombre text,
  add column if not exists visitante_telefono text;

create index if not exists encargo_visitas_visitante_nombre_idx
  on public.encargo_visitas (visitante_nombre)
  where visitante_nombre is not null;

notify pgrst, 'reload schema';
