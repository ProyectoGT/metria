-- Migración: tabla whatsapp_sessions
-- Registra sesiones de WhatsApp por proveedor (meta, openwa).
-- Para el proveedor "meta" el estado es siempre derivado de las env vars;
-- para "openwa" se sincroniza desde los webhooks session.status.

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id                  BIGSERIAL PRIMARY KEY,
  provider            TEXT NOT NULL CHECK (provider IN ('manual', 'meta', 'openwa')),
  external_session_id TEXT,                           -- ID de sesión en OpenWA
  name                TEXT,                           -- Nombre amigable (ej: "metria-main")
  status              TEXT NOT NULL DEFAULT 'not_configured'
                        CHECK (status IN (
                          'not_configured','initializing','scan_qr',
                          'connecting','connected','disconnected','failed'
                        )),
  phone_number        TEXT,                           -- Número conectado (ej: +34600111222)
  connected_at        TIMESTAMPTZ,
  disconnected_at     TIMESTAMPTZ,
  last_qr_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS whatsapp_sessions_provider_idx        ON public.whatsapp_sessions (provider);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_sessions_external_id_idx
  ON public.whatsapp_sessions (provider, external_session_id)
  WHERE external_session_id IS NOT NULL;

-- RLS: solo el service role puede gestionar sesiones (accedido desde Server Actions / API routes)
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_sessions_service_role"
  ON public.whatsapp_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comentario
COMMENT ON TABLE public.whatsapp_sessions IS
  'Estado de sesiones WhatsApp por proveedor. Actualizado por webhooks de OpenWA o manualmente.';
