// POST /api/whatsapp/messages/send
// Envía un mensaje de WhatsApp usando el proveedor activo.
// Requiere usuario autenticado con permiso de envío.
// Aplica rate limiting básico y validaciones de seguridad.

import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/current-user';
import { createAdminClient } from '@/lib/supabase-admin';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider-factory';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

const MAX_TEXT_LENGTH = 4000;

// Rate limiting simple en memoria (por usuario, 20 msg/min).
// Para producción considera usar Redis o un store persistente.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const yo = await getCurrentUserContext();
  if (!yo) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // Rate limit por usuario
  if (!checkRateLimit(String(yo.id))) {
    return NextResponse.json(
      { success: false, error: 'Demasiados mensajes enviados. Espera un minuto.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const to           = typeof b.to          === 'string' ? b.to.trim()          : null;
  const text         = typeof b.text        === 'string' ? b.text.trim()        : null;
  const pedidoId     = typeof b.pedidoId    === 'number' ? b.pedidoId           : null;
  const propiedadId  = typeof b.propiedadId === 'number' ? b.propiedadId        : null;
  const relatedType  = b.relatedType === 'solicitud' || b.relatedType === 'propiedad' ? b.relatedType : null;
  const relatedId    = typeof b.relatedId   === 'number' ? b.relatedId          : null;
  const recipientName = typeof b.recipientName === 'string' ? b.recipientName   : undefined;
  const templateName  = typeof b.templateName  === 'string' ? b.templateName    : undefined;

  if (!to) return NextResponse.json({ error: 'El campo "to" es obligatorio.' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'El campo "text" es obligatorio.' }, { status: 400 });
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `El mensaje no puede superar ${MAX_TEXT_LENGTH} caracteres.` }, { status: 400 });
  }

  const provider = getWhatsAppProvider();
  const supabase = createAdminClient();

  // Guardar intento previo al envío
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted } = await (supabase as any)
    .from('whatsapp_messages')
    .insert({
      empresa_id:      yo.empresaId,
      direction:       'outbound',
      related_type:    relatedType,
      related_id:      relatedId,
      pedido_id:       pedidoId,
      propiedad_id:    propiedadId,
      phone:           to,
      recipient_name:  recipientName ?? null,
      message_body:    text,
      template_name:   templateName ?? null,
      status:          'queued',
      sent_by_user_id: yo.id,
      sent_at:         new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  const result = await provider.sendTextMessage({
    to,
    text,
    recipientName,
    pedidoId: pedidoId ?? undefined,
    propiedadId: propiedadId ?? undefined,
    relatedType: relatedType ?? undefined,
    relatedId: relatedId ?? undefined,
    templateName,
  });

  // Actualizar registro con resultado
  const dbStatus = result.success && result.provider !== 'manual' ? 'sent' : (result.success ? 'prepared' : 'failed');
  if (inserted?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('whatsapp_messages')
      .update({
        status:              dbStatus,
        provider_message_id: result.externalMessageId ?? null,
      })
      .eq('id', inserted.id);
  }

  if (result.success) {
    return NextResponse.json({
      success: true,
      provider: result.provider,
      messageId: result.messageId ?? null,
      externalMessageId: result.externalMessageId ?? null,
      status: dbStatus,
      fallbackUrl: result.fallbackUrl ?? null,
    });
  }

  const fallbackUrl = result.fallbackUrl ?? buildWhatsAppUrl(to, text);
  return NextResponse.json(
    {
      success: false,
      provider: result.provider,
      status: 'failed',
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? 'Error al enviar el mensaje.',
      fallbackUrl,
    },
    { status: 200 } // Devolvemos 200 para que el frontend siempre reciba JSON con fallbackUrl
  );
}
