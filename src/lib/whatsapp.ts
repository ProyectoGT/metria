// Utilidades WhatsApp — Fase 1: enlaces wa.me
// Fase 5+: ampliar con sendWhatsAppMessage(), sendWhatsAppTemplate(), handleWebhook()

/**
 * Normaliza un número de teléfono al formato esperado por wa.me (sin + ni espacios).
 * Asume España (34) si se reciben 9 dígitos sin prefijo.
 */
export function formatPhoneForWhatsApp(phone: string): string | null {
  const cleaned = phone.replace(/[\s()\-\.]/g, "").replace(/^\+/, "");
  if (!cleaned) return null;

  if (/^\d{9}$/.test(cleaned)) return `34${cleaned}`;
  if (/^0034\d{9}$/.test(cleaned)) return cleaned.slice(2); // 0034… → 34…
  if (/^34\d{9}$/.test(cleaned)) return cleaned;
  if (/^\d{10,15}$/.test(cleaned)) return cleaned; // número internacional sin prefijo +

  return null;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = formatPhoneForWhatsApp(phone);
  const phoneParam = normalized ?? phone.replace(/\D/g, "");
  return `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`;
}

// ─── Plantillas ───────────────────────────────────────────────────────────────

export type WhatsAppTemplateKey =
  | "cliente_solicitud"
  | "propietario_seguimiento"
  | "cliente_propiedad_compatible";

type TemplateParams = {
  nombre: string;
  agente: string;
  tipo?: string;
  zona?: string;
  precio?: string;
  habitaciones?: string;
};

const EMPRESA = "Master Iberica";

export function buildWhatsAppMessage(
  template: WhatsAppTemplateKey,
  params: TemplateParams
): string {
  switch (template) {
    case "cliente_solicitud":
      return (
        `Hola ${params.nombre}, soy ${params.agente} de ${EMPRESA}. ` +
        `Me pongo en contacto contigo en relacion a tu solicitud` +
        (params.tipo ? ` de ${params.tipo}` : "") +
        (params.zona ? ` en ${params.zona}` : "") +
        `. ¿Tienes un momento para hablar?`
      );

    case "propietario_seguimiento":
      return (
        `Hola ${params.nombre}, soy ${params.agente} de ${EMPRESA}. ` +
        `Te escribo para actualizarte sobre el seguimiento de tu propiedad` +
        (params.zona ? ` en ${params.zona}` : "") +
        `. ¿Tienes un momento?`
      );

    case "cliente_propiedad_compatible":
      return (
        `Hola ${params.nombre}, soy ${params.agente} de ${EMPRESA}. ` +
        `Tenemos una vivienda que puede encajar con lo que buscas` +
        (params.tipo ? `: ${params.tipo}` : "") +
        (params.zona ? ` en ${params.zona}` : "") +
        (params.precio ? `, precio ${params.precio}` : "") +
        (params.habitaciones ? `, ${params.habitaciones} habitaciones` : "") +
        `. ¿Quieres que te envie mas informacion o agendamos una visita?`
      );
  }
}

export const WHATSAPP_TEMPLATE_LABELS: Record<WhatsAppTemplateKey, string> = {
  cliente_solicitud: "Contacto por solicitud",
  propietario_seguimiento: "Seguimiento propietario",
  cliente_propiedad_compatible: "Propiedad compatible",
};
