import type { NormalizedIncomingWhatsAppMessage } from '../types';

// Estructura esperada de un evento de OpenWA (puede variar según versión).
interface OpenWaWebhookPayload {
  event?: string;
  timestamp?: number;
  idempotencyKey?: string;
  deliveryId?: string;
  session?: {
    id?: string;
    name?: string;
  };
  data?: {
    id?: string;
    from?: string;
    to?: string;
    body?: string;
    type?: string;
    timestamp?: number;
    isGroup?: boolean;
    hasMedia?: boolean;
    contact?: {
      name?: string;
      pushname?: string;
    };
  };
}

// Normaliza el payload de un webhook OpenWA al tipo interno común.
// Devuelve null si el evento no es un mensaje entrante (message.received).
export function normalizeOpenWaWebhook(raw: unknown): NormalizedIncomingWhatsAppMessage | null {
  const p = raw as OpenWaWebhookPayload;

  if (p.event !== 'message.received') return null;

  const data = p.data;
  if (!data?.id || !data?.from) return null;

  // Extraer número de teléfono del chatId (ej: "34600111222@c.us" -> "34600111222")
  const from = data.from.replace('@c.us', '').replace('@g.us', '');

  const idempotencyKey =
    p.idempotencyKey ??
    p.deliveryId ??
    `openwa:${p.event}:${data.id}`;

  const timestamp = data.timestamp
    ? new Date(data.timestamp * 1000).toISOString()
    : new Date((p.timestamp ?? Date.now())).toISOString();

  return {
    provider: 'openwa',
    eventId: data.id,
    idempotencyKey,
    sessionId: p.session?.id,
    externalMessageId: data.id,
    from,
    to: data.to?.replace('@c.us', '').replace('@g.us', ''),
    body: data.body,
    type: data.type ?? 'text',
    direction: 'inbound',
    timestamp,
    waTimestamp: data.timestamp,
    isGroup: data.isGroup ?? false,
    hasMedia: data.hasMedia ?? false,
    contactName: data.contact?.name ?? data.contact?.pushname,
    raw,
  };
}

// Extrae el tipo de evento del payload para procesamiento en el webhook handler.
export function getOpenWaEventType(raw: unknown): string | null {
  const p = raw as OpenWaWebhookPayload;
  return p.event ?? null;
}

// Extrae datos de ACK para message.ack events.
export interface OpenWaAckData {
  messageId: string;
  ack: number;
}

export function extractOpenWaAck(raw: unknown): OpenWaAckData | null {
  const p = raw as OpenWaWebhookPayload;
  if (p.event !== 'message.ack') return null;
  const id  = p.data?.id;
  const ack = (p.data as Record<string, unknown> | undefined)?.ack;
  if (!id || typeof ack !== 'number') return null;
  return { messageId: id, ack };
}

// Mapea el valor numérico de ACK al status de mensaje de Metria.
export function mapAckToStatus(ack: number): string {
  if (ack <= 0) return 'failed';
  if (ack === 1) return 'sent';
  if (ack === 2) return 'sent';
  if (ack === 3) return 'delivered';
  if (ack >= 4) return 'read';
  return 'sent';
}
