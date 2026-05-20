// POST /api/whatsapp/webhook/openwa
// Recibe eventos de OpenWA: message.received, message.sent, message.ack, session.status.
// Valida firma HMAC-SHA256 si OPENWA_WEBHOOK_SECRET está configurado.
// Aplica idempotencia para evitar duplicados.
// Responde siempre 200 para que OpenWA no reintente.

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getOpenWaConfig } from '@/lib/whatsapp/config';
import { verifyOpenWaSignature } from '@/lib/whatsapp/webhook/verify-openwa-signature';
import { normalizeOpenWaWebhook, getOpenWaEventType } from '@/lib/whatsapp/webhook/normalize-openwa-webhook';
import {
  isOpenWaEventDuplicate,
  saveOpenWaWebhookEvent,
  markWebhookEventProcessed,
  markWebhookEventFailed,
  dispatchOpenWaEvent,
} from '@/lib/whatsapp/webhook/process-openwa-event';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const cfg = getOpenWaConfig();

  // Verificar firma si hay secret configurado
  const signature = request.headers.get('x-openwa-signature');
  if (cfg?.webhookSecret) {
    if (!verifyOpenWaSignature(rawBody, signature, cfg.webhookSecret)) {
      console.warn('[openwa-webhook] Firma inválida. Ignorando request.');
      return NextResponse.json({ ok: false, error: 'Invalid signature.' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('[openwa-webhook] Sin OPENWA_WEBHOOK_SECRET en producción.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const eventType = getOpenWaEventType(payload);
  if (!eventType) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Calcular idempotency key
  const p = payload as Record<string, unknown>;
  const idempotencyKey: string =
    (p.idempotencyKey as string | undefined) ??
    (p.deliveryId as string | undefined) ??
    `openwa:${eventType}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  const deliveryId = (p.deliveryId as string | undefined) ?? null;
  const sessionId  = (p.session as Record<string, unknown> | undefined)?.id as string | undefined;

  const supabase = createAdminClient();

  // Comprobar idempotencia
  const isDuplicate = await isOpenWaEventDuplicate(supabase, idempotencyKey);
  if (isDuplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Guardar evento como recibido
  await saveOpenWaWebhookEvent(supabase, {
    event: eventType,
    idempotencyKey,
    deliveryId: deliveryId ?? undefined,
    sessionId,
    rawPayload: payload,
  });

  // Normalizar si es mensaje entrante
  const normalizedMsg = normalizeOpenWaWebhook(payload);

  // Procesar evento
  try {
    await dispatchOpenWaEvent(supabase, payload, normalizedMsg);
    await markWebhookEventProcessed(supabase, idempotencyKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[openwa-webhook] Error procesando evento:', eventType, msg);
    await markWebhookEventFailed(supabase, idempotencyKey, msg);
    // Siempre respondemos 200 para que OpenWA no reintente indefinidamente
  }

  return NextResponse.json({ ok: true });
}
