-- Módulo WhatsApp: registro de comunicaciones comerciales
-- Fase 1: enlaces wa.me con estado "prepared"
-- Fase 5+: providerMessageId + estados completos via Cloud API

create table if not exists public.whatsapp_messages (
  id                  bigserial    primary key,
  empresa_id          bigint       references public.empresas(id) on delete cascade not null,
  direction           text         not null default 'outbound'
                                     check (direction in ('outbound', 'inbound')),
  related_type        text         check (related_type in ('solicitud', 'propiedad', 'visita', 'venta')),
  related_id          bigint,
  pedido_id           bigint       references public.pedidos(id) on delete set null,
  propiedad_id        bigint       references public.propiedades(id) on delete set null,
  phone               text         not null,
  recipient_name      text,
  message_body        text         not null,
  template_name       text,
  -- En Fase 1: "prepared" (enlace wa.me abierto). Fases siguientes: sent/delivered/read/failed.
  status              text         not null default 'prepared'
                                     check (status in ('draft', 'prepared', 'sent', 'delivered', 'read', 'failed')),
  sent_by_user_id     bigint       references public.usuarios(id) on delete set null,
  sent_at             timestamptz  default now(),
  created_at          timestamptz  default now() not null,
  -- Reservado para WhatsApp Cloud API (Fase 5)
  provider_message_id text
);

create index if not exists whatsapp_messages_empresa_sent_at_idx
  on public.whatsapp_messages (empresa_id, sent_at desc);
create index if not exists whatsapp_messages_pedido_id_idx
  on public.whatsapp_messages (pedido_id) where pedido_id is not null;
create index if not exists whatsapp_messages_propiedad_id_idx
  on public.whatsapp_messages (propiedad_id) where propiedad_id is not null;
create index if not exists whatsapp_messages_sent_by_idx
  on public.whatsapp_messages (sent_by_user_id) where sent_by_user_id is not null;

alter table public.whatsapp_messages enable row level security;

-- Usuarios ven mensajes de su empresa
create policy "whatsapp_messages_select"
  on public.whatsapp_messages for select
  using (
    empresa_id in (
      select empresa_id from public.usuarios
      where auth_id = auth.uid()
    )
  );

-- Usuarios insertan mensajes en su empresa
create policy "whatsapp_messages_insert"
  on public.whatsapp_messages for insert
  with check (
    empresa_id in (
      select empresa_id from public.usuarios
      where auth_id = auth.uid()
    )
  );

-- Service role (webhooks Fase 5, actualizaciones de estado)
create policy "whatsapp_messages_service_role"
  on public.whatsapp_messages for all
  using (auth.role() = 'service_role');
