"use server";

// Módulo WhatsApp — Server Actions
// Fase 1: registrar contacto manual via enlace wa.me (status "prepared")
// Fase 5+: añadir sendWhatsAppApiMessage(), sendWhatsAppTemplate(), updateMessageStatus()

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";

export type LogWhatsAppParams = {
  phone: string;
  recipientName: string;
  messageBody: string;
  templateName?: string;
  relatedType: "solicitud" | "propiedad";
  relatedId: number;
  pedidoId?: number;
  propiedadId?: number;
};

export async function logWhatsAppContactAction(params: LogWhatsAppParams): Promise<void> {
  const yo = await getCurrentUserContext();
  if (!yo?.empresaId) return;

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("whatsapp_messages").insert({
    empresa_id:        yo.empresaId,
    direction:         "outbound",
    related_type:      params.relatedType,
    related_id:        params.relatedId,
    pedido_id:         params.pedidoId ?? null,
    propiedad_id:      params.propiedadId ?? null,
    phone:             params.phone,
    recipient_name:    params.recipientName,
    message_body:      params.messageBody,
    template_name:     params.templateName ?? null,
    status:            "prepared",
    sent_by_user_id:   yo.id,
    sent_at:           new Date().toISOString(),
  });
}

// ─── Tipos para historial (Fase 4) ───────────────────────────────────────────

export type WhatsAppMessage = {
  id: number;
  direction: "outbound" | "inbound";
  related_type: string | null;
  related_id: number | null;
  pedido_id: number | null;
  propiedad_id: number | null;
  phone: string;
  recipient_name: string | null;
  message_body: string;
  template_name: string | null;
  status: string;
  sent_by_user_id: number | null;
  sent_at: string | null;
  created_at: string;
};

export async function getWhatsAppHistoryAction(params: {
  pedidoId?: number;
  propiedadId?: number;
  limit?: number;
}): Promise<WhatsAppMessage[]> {
  const yo = await getCurrentUserContext();
  if (!yo?.empresaId) return [];

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("whatsapp_messages")
    .select("*")
    .eq("empresa_id", yo.empresaId)
    .order("sent_at", { ascending: false })
    .limit(params.limit ?? 50);

  if (params.pedidoId) query = query.eq("pedido_id", params.pedidoId);
  if (params.propiedadId) query = query.eq("propiedad_id", params.propiedadId);

  const { data } = await query;
  return (data ?? []) as WhatsAppMessage[];
}
