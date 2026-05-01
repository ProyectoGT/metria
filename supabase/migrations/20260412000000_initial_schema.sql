create table if not exists public.usuarios (
  id bigserial primary key,
  nombre text not null,
  apellidos text not null default '',
  puesto text,
  rol text,
  correo text not null,
  auth_id uuid unique,
  created_at timestamptz not null default now()
);

create table if not exists public.zona (
  id bigserial primary key,
  nombre text not null
);

create table if not exists public.sectores (
  id bigserial primary key,
  numero integer not null,
  zona_id bigint references public.zona (id) on delete cascade
);

create table if not exists public.fincas (
  id bigserial primary key,
  numero text not null,
  sector_id bigint references public.sectores (id) on delete cascade
);

create table if not exists public.propiedades (
  id bigserial primary key,
  planta text,
  puerta text,
  propietario text,
  telefono text,
  estado text,
  fecha_visita date,
  notas text,
  honorarios numeric,
  agente_asignado bigint references public.usuarios (id) on delete set null,
  finca_id bigint references public.fincas (id) on delete cascade
);

create table if not exists public.archivos (
  id bigserial primary key,
  nombre text not null,
  propiedad_id bigint references public.propiedades (id) on delete cascade,
  tipo text not null default 'documento',
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.encargo_notas (
  id bigserial primary key,
  propiedad_id bigint not null references public.propiedades (id) on delete cascade,
  contenido text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pedidos (
  id bigserial primary key,
  nombre_cliente text not null,
  telefono text,
  tipo_propiedad text,
  zona_deseada bigint references public.zona (id) on delete set null,
  presupuesto numeric,
  compra_alquiler boolean,
  habitaciones integer,
  garaje boolean,
  origen text,
  referencia text,
  caracteristicas text,
  notas text
);

create table if not exists public.agenda (
  id bigserial primary key,
  description text not null,
  event_date date not null,
  time time,
  priority text not null default 'media',
  completed boolean not null default false,
  result text,
  gcal_event_id text,
  user_id bigint references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tareas (
  id bigserial primary key,
  titulo text not null,
  prioridad text,
  estado text,
  fecha_limite timestamptz,
  agente_asignado bigint references public.usuarios (id) on delete set null
);
