create table if not exists public.encargo_visitas (
  id bigserial primary key,
  propiedad_id bigint not null references public.propiedades (id) on delete cascade,
  agente_id bigint references public.usuarios (id) on delete set null,
  agente_nombre text not null,
  fecha_visita timestamptz not null default now(),
  observaciones text,
  created_at timestamptz not null default now()
);

alter table public.encargo_visitas enable row level security;

create policy "Authenticated users can manage encargo_visitas"
  on public.encargo_visitas
  for all
  to authenticated
  using (true)
  with check (true);
