-- Consentimiento WhatsApp en pedidos (RGPD)
-- whatsapp_consent: null=desconocido, true=ha dado consentimiento, false=no quiere ser contactado
alter table public.pedidos
  add column if not exists whatsapp_consent     boolean     default null,
  add column if not exists whatsapp_opt_out_at  timestamptz default null;

comment on column public.pedidos.whatsapp_consent    is 'null=desconocido, true=consentimiento dado, false=opt-out';
comment on column public.pedidos.whatsapp_opt_out_at is 'Fecha en que el cliente solicitó no ser contactado por WhatsApp';
