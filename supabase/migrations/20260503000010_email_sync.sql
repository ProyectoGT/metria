-- Email sync module: private user mailbox data with strict per-user RLS.

create or replace function public.current_user_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.usuarios u
  where u.auth_id = auth.uid()
  limit 1
$$;

create table if not exists public.email_accounts (
  id bigserial primary key,
  empresa_id bigint references public.empresas(id) on delete cascade,
  user_id bigint not null references public.usuarios(id) on delete cascade,
  provider text not null default 'gmail',
  email text not null,
  status text not null default 'connected',
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_accounts_provider_check check (provider in ('gmail','outlook')),
  constraint email_accounts_status_check check (status in ('connected','not_connected','sync_error','reauth_required','disconnected')),
  constraint email_accounts_user_provider_email_unique unique (user_id, provider, email)
);

create table if not exists public.email_messages (
  id bigserial primary key,
  empresa_id bigint references public.empresas(id) on delete cascade,
  user_id bigint not null references public.usuarios(id) on delete cascade,
  account_id bigint not null references public.email_accounts(id) on delete cascade,
  provider text not null default 'gmail',
  provider_message_id text not null,
  provider_thread_id text,
  from_email text,
  from_name text,
  to_emails jsonb not null default '[]'::jsonb,
  cc_emails jsonb not null default '[]'::jsonb,
  subject text,
  snippet text,
  body_text text,
  body_html text,
  received_at timestamptz,
  sent_at timestamptz,
  is_read boolean not null default false,
  has_attachments boolean not null default false,
  direction text not null default 'inbound',
  folder text not null default 'inbox',
  raw_metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_messages_direction_check check (direction in ('inbound','outbound')),
  constraint email_messages_folder_check check (folder in ('inbox','sent','archive')),
  constraint email_messages_unique unique (account_id, provider_message_id)
);

create table if not exists public.email_entity_links (
  id bigserial primary key,
  empresa_id bigint references public.empresas(id) on delete cascade,
  email_message_id bigint not null references public.email_messages(id) on delete cascade,
  entity_type text not null,
  entity_id bigint not null,
  confidence_score numeric(4,3) not null default 0.5,
  linked_by text not null default 'system',
  created_at timestamptz not null default now(),
  constraint email_entity_links_type_check check (entity_type in ('contacto','pedido','propiedad','tarea','lead')),
  constraint email_entity_links_by_check check (linked_by in ('system','user')),
  constraint email_entity_links_unique unique (email_message_id, entity_type, entity_id)
);

create table if not exists public.email_templates (
  id bigserial primary key,
  empresa_id bigint references public.empresas(id) on delete cascade,
  name text not null,
  subject text not null,
  body_html text,
  body_text text not null,
  category text not null,
  created_by bigint references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_accounts_user_idx on public.email_accounts(user_id, provider);
create index if not exists email_accounts_empresa_idx on public.email_accounts(empresa_id);
create index if not exists email_messages_user_folder_idx on public.email_messages(user_id, folder, received_at desc);
create index if not exists email_messages_account_thread_idx on public.email_messages(account_id, provider_thread_id);
create index if not exists email_messages_search_idx on public.email_messages using gin (
  to_tsvector('simple', coalesce(subject,'') || ' ' || coalesce(snippet,'') || ' ' || coalesce(body_text,''))
);
create index if not exists email_entity_links_message_idx on public.email_entity_links(email_message_id);
create index if not exists email_entity_links_entity_idx on public.email_entity_links(entity_type, entity_id);
create index if not exists email_templates_empresa_idx on public.email_templates(empresa_id, category);

create or replace function public.set_email_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_accounts_updated_at on public.email_accounts;
create trigger email_accounts_updated_at
  before update on public.email_accounts
  for each row execute function public.set_email_updated_at();

drop trigger if exists email_templates_updated_at on public.email_templates;
create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_email_updated_at();

alter table public.email_accounts enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_entity_links enable row level security;
alter table public.email_templates enable row level security;

drop policy if exists email_accounts_select_own on public.email_accounts;
create policy email_accounts_select_own on public.email_accounts for select
using (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_accounts_insert_own on public.email_accounts;
create policy email_accounts_insert_own on public.email_accounts for insert
with check (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_accounts_update_own on public.email_accounts;
create policy email_accounts_update_own on public.email_accounts for update
using (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
)
with check (
  user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_accounts_delete_own on public.email_accounts;
create policy email_accounts_delete_own on public.email_accounts for delete
using (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_messages_select_own on public.email_messages;
create policy email_messages_select_own on public.email_messages for select
using (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_messages_insert_own on public.email_messages;
create policy email_messages_insert_own on public.email_messages for insert
with check (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_messages_update_own on public.email_messages;
create policy email_messages_update_own on public.email_messages for update
using (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
)
with check (
  user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_messages_delete_own on public.email_messages;
create policy email_messages_delete_own on public.email_messages for delete
using (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_links_select_own_message on public.email_entity_links;
create policy email_links_select_own_message on public.email_entity_links for select
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and exists (
    select 1 from public.email_messages m
    where m.id = email_message_id
      and m.user_id = public.current_user_id()
      and m.empresa_id = public.current_empresa_id()
  )
);

drop policy if exists email_links_insert_own_message on public.email_entity_links;
create policy email_links_insert_own_message on public.email_entity_links for insert
with check (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and exists (
    select 1 from public.email_messages m
    where m.id = email_message_id
      and m.user_id = public.current_user_id()
      and m.empresa_id = public.current_empresa_id()
  )
);

drop policy if exists email_links_delete_own_message on public.email_entity_links;
create policy email_links_delete_own_message on public.email_entity_links for delete
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and exists (
    select 1 from public.email_messages m
    where m.id = email_message_id
      and m.user_id = public.current_user_id()
      and m.empresa_id = public.current_empresa_id()
  )
);

drop policy if exists email_templates_select_company on public.email_templates;
create policy email_templates_select_company on public.email_templates for select
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
);

drop policy if exists email_templates_insert_company on public.email_templates;
create policy email_templates_insert_company on public.email_templates for insert
with check (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and created_by = public.current_user_id()
);

drop policy if exists email_templates_update_company on public.email_templates;
create policy email_templates_update_company on public.email_templates for update
using (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
  and (created_by = public.current_user_id() or public.is_admin_or_director())
)
with check (
  empresa_id = public.current_empresa_id()
);

insert into public.email_templates (empresa_id, name, subject, body_text, category, created_by)
select e.id, tpl.name, tpl.subject, tpl.body_text, tpl.category, null
from public.empresas e
cross join (
  values
    ('Primer contacto', 'Encantado de saludarte, {{nombre_contacto}}', 'Hola {{nombre_contacto}}, soy {{nombre_agente}} de Metria. Te escribo para ayudarte con tu busqueda y resolver cualquier duda que tengas.', 'primer_contacto'),
    ('Seguimiento de solicitud', 'Seguimiento de tu solicitud', 'Hola {{nombre_contacto}}, queria revisar contigo si seguimos teniendo bien encajadas tus preferencias y presupuesto.', 'seguimiento_solicitud'),
    ('Propuesta de propiedad', 'Propuesta: {{propiedad_titulo}}', 'Hola {{nombre_contacto}}, te envio una propiedad que puede encajar: {{propiedad_titulo}}. Precio: {{precio}}. Direccion: {{direccion}}.', 'propuesta_propiedad'),
    ('Recordatorio de visita', 'Recordatorio de visita', 'Hola {{nombre_contacto}}, te recuerdo la visita prevista para {{fecha_visita}}. Cualquier cambio me dices.', 'recordatorio_visita'),
    ('Reactivacion de cliente frio', 'Seguimos a tu disposicion', 'Hola {{nombre_contacto}}, hace tiempo que no hablamos. Si sigues buscando, puedo actualizarte opciones nuevas.', 'reactivacion'),
    ('Propietario: seguimiento de encargo', 'Seguimiento de encargo', 'Hola {{nombre_contacto}}, te envio un resumen del seguimiento de tu encargo y proximos pasos.', 'seguimiento_encargo'),
    ('Cierre o agradecimiento', 'Gracias por confiar en nosotros', 'Hola {{nombre_contacto}}, gracias por confiar en {{nombre_agente}} y en el equipo. Seguimos a tu disposicion.', 'cierre')
) as tpl(name, subject, body_text, category)
where not exists (
  select 1 from public.email_templates t
  where t.empresa_id = e.id and t.category = tpl.category and t.name = tpl.name
);
