create table if not exists public.idealista_leads (
  id bigserial primary key,
  gmail_message_id text unique not null,
  nombre text,
  email_contacto text,
  telefono text,
  mensaje text,
  referencia text,
  url_propiedad text,
  titulo_propiedad text,
  asunto text,
  fecha_contacto timestamptz,
  estado text not null default 'nuevo',
  notas text,
  empresa_id bigint references public.empresas (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.idealista_leads enable row level security;

create policy "Authenticated users can manage idealista_leads"
  on public.idealista_leads
  for all
  to authenticated
  using (true)
  with check (true);

create index idealista_leads_empresa_id_idx on public.idealista_leads (empresa_id);
create index idealista_leads_estado_idx on public.idealista_leads (estado);
create index idealista_leads_fecha_idx on public.idealista_leads (fecha_contacto desc);
