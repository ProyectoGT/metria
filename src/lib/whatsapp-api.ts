// WhatsApp Cloud API — Servicio de envío oficial
//
// Activación: basta con definir WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env.local
// Sin credenciales → isApiEnabled() devuelve false y las acciones hacen fallback a wa.me
//
// Documentación Meta: https://developers.facebook.com/docs/whatsapp/cloud-api/messages

import crypto from "crypto";

// ─── Estado de la integración ────────────────────────────────────────────────

export function isApiEnabled(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

const API_VERSION = "v20.0";
const BASE_URL    = `https://graph.facebook.com/${API_VERSION}`;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SendResult =
  | { ok: true;  messageId: string }
  | { ok: false; error: string; fallbackToLink: true };

export type WhatsAppStatusEvent = {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipientPhone: string;
  timestamp: number;
  errorCode?: number;
  errorTitle?: string;
};

export type WhatsAppInboundMessage = {
  from: string;
  messageId: string;
  timestamp: number;
  type: "text" | "image" | "audio" | "document" | "video" | "unknown";
  text?: string;
  businessAccountId: string;
};

export type ParsedWebhookPayload =
  | { kind: "statuses"; events: WhatsAppStatusEvent[] }
  | { kind: "messages"; messages: WhatsAppInboundMessage[] }
  | { kind: "unknown" };

// ─── Envío de mensaje de texto libre ─────────────────────────────────────────
// Solo válido dentro de la ventana de 24h después de que el cliente escriba primero.
// Para primer contacto se necesita una plantilla aprobada (sendTemplate).

export async function sendTextMessage(params: {
  to: string;
  body: string;
}): Promise<SendResult> {
  if (!isApiEnabled()) {
    return { ok: false, error: "API no configurada", fallbackToLink: true };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token         = process.env.WHATSAPP_ACCESS_TOKEN!;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.to,
    type: "text",
    text: { preview_url: false, body: params.body },
  };

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json() as {
      messages?: Array<{ id: string }>;
      error?: { message: string; code: number };
    };

    if (!res.ok || json.error) {
      const errMsg = json.error?.message ?? `HTTP ${res.status}`;
      console.error("[whatsapp-api] sendTextMessage error:", errMsg);
      return { ok: false, error: errMsg, fallbackToLink: true };
    }

    const messageId = json.messages?.[0]?.id ?? "";
    return { ok: true, messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: msg, fallbackToLink: true };
  }
}

// ─── Envío de plantilla aprobada por Meta ────────────────────────────────────
// Necesario para primer contacto con clientes (fuera ventana 24h).

export type TemplateComponent = {
  type: "header" | "body" | "button";
  parameters: Array<{ type: "text"; text: string } | { type: "currency"; currency: { fallback_value: string; code: string; amount_1000: number } }>;
};

export async function sendTemplate(params: {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}): Promise<SendResult> {
  if (!isApiEnabled()) {
    return { ok: false, error: "API no configurada", fallbackToLink: true };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token         = process.env.WHATSAPP_ACCESS_TOKEN!;

  const payload = {
    messaging_product: "whatsapp",
    to: params.to,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode ?? "es" },
      ...(params.components ? { components: params.components } : {}),
    },
  };

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json() as {
      messages?: Array<{ id: string }>;
      error?: { message: string; code: number };
    };

    if (!res.ok || json.error) {
      const errMsg = json.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: errMsg, fallbackToLink: true };
    }

    return { ok: true, messageId: json.messages?.[0]?.id ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: msg, fallbackToLink: true };
  }
}

// ─── Verificación de firma del webhook ───────────────────────────────────────

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Parseo del payload de webhook ───────────────────────────────────────────

type RawWebhookEntry = {
  id?: string;
  changes?: Array<{
    value?: {
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
        errors?: Array<{ code: number; title: string }>;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
      }>;
      metadata?: { phone_number_id: string; display_phone_number: string };
    };
    field?: string;
  }>;
};

export function parseWebhookPayload(body: unknown): ParsedWebhookPayload {
  const payload = body as {
    object?: string;
    entry?: RawWebhookEntry[];
  };

  if (payload.object !== "whatsapp_business_account") return { kind: "unknown" };

  const statuses: WhatsAppStatusEvent[] = [];
  const messages: WhatsAppInboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    const businessAccountId = entry.id ?? "";
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      for (const s of value.statuses ?? []) {
        const rawStatus = s.status;
        if (!["sent", "delivered", "read", "failed"].includes(rawStatus)) continue;
        statuses.push({
          messageId:      s.id,
          status:         rawStatus as WhatsAppStatusEvent["status"],
          recipientPhone: s.recipient_id,
          timestamp:      Number(s.timestamp),
          errorCode:      s.errors?.[0]?.code,
          errorTitle:     s.errors?.[0]?.title,
        });
      }

      for (const m of value.messages ?? []) {
        messages.push({
          from:               m.from,
          messageId:          m.id,
          timestamp:          Number(m.timestamp),
          type:               ["text", "image", "audio", "document", "video"].includes(m.type)
                                ? (m.type as WhatsAppInboundMessage["type"])
                                : "unknown",
          text:               m.text?.body,
          businessAccountId,
        });
      }
    }
  }

  if (statuses.length > 0) return { kind: "statuses", events: statuses };
  if (messages.length > 0) return { kind: "messages", messages };
  return { kind: "unknown" };
}
