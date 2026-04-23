alter table propiedades
  add column if not exists contactado_hasta timestamptz null;
