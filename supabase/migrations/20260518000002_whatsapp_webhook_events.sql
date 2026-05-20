-- Migración: tabla whatsapp_webhook_events
-- Auditoría e idempotencia para webhooks de OpenWA.
-- idempotency_key tiene UNIQUE para garantizar procesamiento exactamente una vez.

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id               BIGSERIAL PRIMARY KEY,
  provider         TEXT NOT NULL DEFAULT 'openwa' CHECK (provider IN ('manual', 'meta', 'openwa')),
  event            TEXT NOT NULL,                  -- ej: message.received, message.ack, session.status
  delivery_id      TEXT,                           -- ID de entrega del proveedor
  idempotency_key  TEXT NOT NULL UNIQUE,           -- Garantiza procesamiento único por evento
  session_id       TEXT,                           -- ID de sesión OpenWA origen
  status           TEXT NOT NULL DEFAULT 'received'
                     CHECK (status IN ('received', 'processed', 'failed', 'duplicate')),
  processed_at     TIMESTAMPTZ,
  error_message    TEXT,
  raw_payload      JSONB,                          -- Payload completo (solo en servidor, nunca al cliente)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_idempotency_idx ON public.whatsapp_webhook_events (idempotency_key);
CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_delivery_idx    ON public.whatsapp_webhook_events (delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_event_idx       ON public.whatsapp_webhook_events (event);
CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_created_at_idx  ON public.whatsapp_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_status_idx      ON public.whatsapp_webhook_events (status);

-- RLS: solo el service role puede acceder (webhook handler usa createAdminClient)
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_webhook_events_service_role"
  ON public.whatsapp_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Retención: opcionalmente programar limpieza de eventos antiguos procesados
-- DELETE FROM whatsapp_webhook_events WHERE created_at < NOW() - INTERVAL '90 days' AND status = 'processed';

COMMENT ON TABLE public.whatsapp_webhook_events IS
  'Auditoría e idempotencia de webhooks recibidos de OpenWA. Nunca exponer raw_payload al cliente.';
