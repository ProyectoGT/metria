alter table public.propiedades
  add column if not exists propietario_secundario text,
  add column if not exists telefono_secundario text;

notify pgrst, 'reload schema';
