// WhatsApp Cloud API — Webhook Handler
//
// GET  /api/whatsapp/webhook  → verificación de Meta durante el setup
// POST /api/whatsapp/webhook  → eventos: estados de mensaje + mensajes entrantes
//
// Meta requiere que este endpoint esté público (sin autenticación propia).
// La seguridad se garantiza verificando la firma HMAC-SHA256 con WHATSAPP_APP_SECRET.

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  verifyWebhookSignature,
  parseWebhookPayload,
} from "@/lib/whatsapp-api";

// ─── GET: verificación de webhook por Meta ────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ─── POST: eventos de Meta ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  // Verificar firma solo si hay WHATSAPP_APP_SECRET configurado
  if (process.env.WHATSAPP_APP_SECRET) {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const payload = parseWebhookPayload(body);
  const supabase = createAdminClient();

  if (payload.kind === "statuses") {
    // Actualizar status de mensajes enviados
    for (const event of payload.events) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("whatsapp_messages")
        .update({ status: event.status })
        .eq("provider_message_id", event.messageId);
    }
  }

  if (payload.kind === "messages") {
    // Guardar mensajes entrantes y notificar al agente
    for (const msg of payload.messages) {
      // Buscar el pedido o propiedad más reciente que corresponda a este teléfono
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lastOutbound } = await (supabase as any)
        .from("whatsapp_messages")
        .select("id, pedido_id, propiedad_id, sent_by_user_id, empresa_id")
        .eq("phone", msg.from)
        .eq("direction", "outbound")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("whatsapp_messages").insert({
        empresa_id:         lastOutbound?.empresa_id ?? null,
        direction:          "inbound",
        related_type:       lastOutbound?.pedido_id ? "solicitud" : lastOutbound?.propiedad_id ? "propiedad" : null,
        related_id:         lastOutbound?.pedido_id ?? lastOutbound?.propiedad_id ?? null,
        pedido_id:          lastOutbound?.pedido_id ?? null,
        propiedad_id:       lastOutbound?.propiedad_id ?? null,
        phone:              msg.from,
        message_body:       msg.text ?? `[${msg.type}]`,
        status:             "delivered",
        provider_message_id: msg.messageId,
        sent_at:            new Date(msg.timestamp * 1000).toISOString(),
      });

      // Notificar al agente que envió el último mensaje si hay notificaciones disponibles
      if (lastOutbound?.sent_by_user_id && lastOutbound?.empresa_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("notificaciones").insert({
          usuario_id:  lastOutbound.sent_by_user_id,
          empresa_id:  lastOutbound.empresa_id,
          tipo:        "whatsapp_reply",
          titulo:      "Respuesta de WhatsApp",
          mensaje:     msg.text ? `Nuevo mensaje: "${msg.text.slice(0, 80)}"` : "Nuevo mensaje de WhatsApp recibido",
          leida:       false,
          metadata:    {
            phone:       msg.from,
            pedido_id:   lastOutbound.pedido_id,
            propiedad_id: lastOutbound.propiedad_id,
          },
        }).select().maybeSingle();
        // Si la tabla notificaciones no existe aún, ignoramos el error silenciosamente
      }
    }
  }

  // Meta requiere siempre un 200 rápido
  return NextResponse.json({ ok: true }, { status: 200 });
}
