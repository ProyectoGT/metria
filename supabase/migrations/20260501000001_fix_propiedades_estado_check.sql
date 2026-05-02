-- Fix check constraint on propiedades.estado to include 'investigacion'
alter table propiedades
  drop constraint if exists propiedades_estado_check;

alter table propiedades
  add constraint propiedades_estado_check
    check (estado in ('neutral', 'investigacion', 'seguimiento', 'noticia', 'encargo', 'vendido'));
