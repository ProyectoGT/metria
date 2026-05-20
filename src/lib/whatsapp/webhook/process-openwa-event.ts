import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedIncomingWhatsAppMessage } from '../types';
import {
  getOpenWaEventType,
  extractOpenWaAck,
  mapAckToStatus,
} from './normalize-openwa-webhook';

// ─── Idempotencia ─────────────────────────────────────────────────────────────

// Verifica si un evento ya fue procesado. Devuelve true si es duplicado.
export async function isOpenWaEventDuplicate(
  supabase: SupabaseClient,
  idempotencyKey: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('whatsapp_webhook_events')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  return data !== null && data.status === 'processed';
}

// Guarda el evento como recibido. Devuelve el id del registro creado.
export async function saveOpenWaWebhookEvent(
  supabase: SupabaseClient,
  params: {
    event: string;
    idempotencyKey: string;
    deliveryId?: string;
    sessionId?: string;
    rawPayload: unknown;
  }
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('whatsapp_webhook_events')
    .insert({
      provider: 'openwa',
      event: params.event,
      idempotency_key: params.idempotencyKey,
      delivery_id: params.deliveryId ?? null,
      session_id: params.sessionId ?? null,
      status: 'received',
      raw_payload: params.rawPayload,
    })
    .select('id')
    .maybeSingle();

  return data?.id ?? null;
}

export async function markWebhookEventProcessed(
  supabase: SupabaseClient,
  idempotencyKey: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('whatsapp_webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('idempotency_key', idempotencyKey);
}

export async function markWebhookEventFailed(
  supabase: SupabaseClient,
  idempotencyKey: string,
  errorMessage: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('whatsapp_webhook_events')
    .update({ status: 'failed', error_message: errorMessage.slice(0, 500) })
    .eq('idempotency_key', idempotencyKey);
}

// ─── Procesamiento por tipo de evento ────────────────────────────────────────

// Procesa message.received: guarda el mensaje inbound y notifica al agente.
export async function processOpenWaMessageReceived(
  supabase: SupabaseClient,
  msg: NormalizedIncomingWhatsAppMessage
): Promise<void> {
  // Buscar el último outbound de este teléfono para inferir contexto
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastOutbound } = await (supabase as any)
    .from('whatsapp_messages')
    .select('id, pedido_id, propiedad_id, sent_by_user_id, empresa_id')
    .eq('phone', msg.from)
    .eq('direction', 'outbound')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('whatsapp_messages').insert({
    empresa_id:          lastOutbound?.empresa_id ?? null,
    direction:           'inbound',
    related_type:        lastOutbound?.pedido_id ? 'solicitud' : lastOutbound?.propiedad_id ? 'propiedad' : null,
    related_id:          lastOutbound?.pedido_id ?? lastOutbound?.propiedad_id ?? null,
    pedido_id:           lastOutbound?.pedido_id ?? null,
    propiedad_id:        lastOutbound?.propiedad_id ?? null,
    phone:               msg.from,
    message_body:        msg.body ?? `[${msg.type}]`,
    status:              'delivered',
    provider_message_id: msg.externalMessageId,
    sent_at:             msg.timestamp,
  });

  // Notificar al agente que envió el último mensaje
  if (lastOutbound?.sent_by_user_id && lastOutbound?.empresa_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notificaciones').insert({
      usuario_id:  lastOutbound.sent_by_user_id,
      empresa_id:  lastOutbound.empresa_id,
      tipo:        'whatsapp_reply',
      titulo:      'Respuesta de WhatsApp',
      mensaje:     msg.body
        ? `Nuevo mensaje: "${msg.body.slice(0, 80)}"`
        : 'Nuevo mensaje de WhatsApp recibido',
      leida:   false,
      metadata: {
        phone:       msg.from,
        pedido_id:   lastOutbound.pedido_id,
        propiedad_id: lastOutbound.propiedad_id,
        provider:    'openwa',
      },
    }).select().maybeSingle();
    // Si la tabla notificaciones no existe, el error se ignora silenciosamente
  }
}

// Procesa message.ack: actualiza el estado de entrega del mensaje outbound.
export async function processOpenWaMessageAck(
  supabase: SupabaseClient,
  rawPayload: unknown
): Promise<void> {
  const ackData = extractOpenWaAck(rawPayload);
  if (!ackData) return;

  const newStatus = mapAckToStatus(ackData.ack);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('whatsapp_messages')
    .update({ status: newStatus })
    .eq('provider_message_id', ackData.messageId);
}

// Procesa session.status: registra cambios de estado de la sesión.
export async function processOpenWaSessionStatus(
  supabase: SupabaseClient,
  rawPayload: unknown
): Promise<void> {
  const p = rawPayload as Record<string, unknown>;
  const data = p.data as Record<string, unknown> | undefined;
  const status = typeof data?.status === 'string' ? data.status : null;
  const sessionId = typeof (p.session as Record<string, unknown> | undefined)?.id === 'string'
    ? (p.session as Record<string, unknown>).id as string
    : null;

  if (!sessionId || !status) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('whatsapp_sessions')
    .update({
      status: status.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('external_session_id', sessionId)
    .eq('provider', 'openwa');
}

// Orquestador: despacha el evento al handler correcto.
export async function dispatchOpenWaEvent(
  supabase: SupabaseClient,
  rawPayload: unknown,
  normalizedMsg: NormalizedIncomingWhatsAppMessage | null
): Promise<void> {
  const eventType = getOpenWaEventType(rawPayload);
  if (!eventType) return;

  switch (eventType) {
    case 'message.received':
      if (normalizedMsg) await processOpenWaMessageReceived(supabase, normalizedMsg);
      break;
    case 'message.ack':
      await processOpenWaMessageAck(supabase, rawPayload);
      break;
    case 'session.status':
    case 'session.authenticated':
    case 'session.disconnected':
      await processOpenWaSessionStatus(supabase, rawPayload);
      break;
    default:
      // Evento no manejado: no hace nada (ya quedó guardado en whatsapp_webhook_events)
      break;
  }
}
