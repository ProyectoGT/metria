"use server";

// Módulo WhatsApp — Server Actions
//
// sendOrPrepareWhatsAppAction: envía vía Cloud API si hay credenciales,
// si no registra como "prepared" y devuelve la URL de wa.me para que el
// cliente abra WhatsApp manualmente. Sin cambios en el frontend.

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { sendTextMessage, isApiEnabled } from "@/lib/whatsapp-api";
import { formatPhoneForWhatsApp, buildWhatsAppUrl } from "@/lib/whatsapp";

export type SendWhatsAppParams = {
  phone: string;
  recipientName: string;
  messageBody: string;
  templateName?: string;
  relatedType: "solicitud" | "propiedad";
  relatedId: number;
  pedidoId?: number;
  propiedadId?: number;
};

export type SendWhatsAppResult =
  | { sent: true;  messageId: string }
  | { sent: false; fallbackUrl: string };

// Acción principal: API si disponible, wa.me si no
export async function sendOrPrepareWhatsAppAction(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  const yo = await getCurrentUserContext();
  if (!yo?.empresaId) {
    return { sent: false, fallbackUrl: buildWhatsAppUrl(params.phone, params.messageBody) };
  }

  const supabase = await createClient();
  const normalizedPhone = formatPhoneForWhatsApp(params.phone) ?? params.phone.replace(/\D/g, "");

  if (isApiEnabled()) {
    // Intentar envío real
    const result = await sendTextMessage({ to: normalizedPhone, body: params.messageBody });

    if (result.ok) {
      // Registrar como enviado
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("whatsapp_messages").insert({
        empresa_id:          yo.empresaId,
        direction:           "outbound",
        related_type:        params.relatedType,
        related_id:          params.relatedId,
        pedido_id:           params.pedidoId ?? null,
        propiedad_id:        params.propiedadId ?? null,
        phone:               normalizedPhone,
        recipient_name:      params.recipientName,
        message_body:        params.messageBody,
        template_name:       params.templateName ?? null,
        status:              "sent",
        sent_by_user_id:     yo.id,
        sent_at:             new Date().toISOString(),
        provider_message_id: result.messageId,
      });
      return { sent: true, messageId: result.messageId };
    }
    // Si falla la API, caer a wa.me
  }

  // Modo manual: registrar como "prepared" y devolver URL para abrir WhatsApp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("whatsapp_messages").insert({
    empresa_id:      yo.empresaId,
    direction:       "outbound",
    related_type:    params.relatedType,
    related_id:      params.relatedId,
    pedido_id:       params.pedidoId ?? null,
    propiedad_id:    params.propiedadId ?? null,
    phone:           normalizedPhone,
    recipient_name:  params.recipientName,
    message_body:    params.messageBody,
    template_name:   params.templateName ?? null,
    status:          "prepared",
    sent_by_user_id: yo.id,
    sent_at:         new Date().toISOString(),
  });

  return {
    sent: false,
    fallbackUrl: buildWhatsAppUrl(params.phone, params.messageBody),
  };
}

// Alias para compatibilidad con código existente
export async function logWhatsAppContactAction(params: SendWhatsAppParams): Promise<void> {
  await sendOrPrepareWhatsAppAction(params);
}

// ─── Historial ────────────────────────────────────────────────────────────────

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

  if (params.pedidoId)    query = query.eq("pedido_id", params.pedidoId);
  if (params.propiedadId) query = query.eq("propiedad_id", params.propiedadId);

  const { data } = await query;
  return (data ?? []) as WhatsAppMessage[];
}

// ─── Todos los mensajes (portal comunicaciones) ───────────────────────────────

export type ComunicacionesFilters = {
  agenteId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  tipo?: "solicitud" | "propiedad";
  busqueda?: string;
  page?: number;
  pageSize?: number;
};

export type ComunicacionesRow = WhatsAppMessage & {
  sent_by_name: string | null;
};

export async function getComunicacionesAction(
  filters: ComunicacionesFilters = {}
): Promise<{ rows: ComunicacionesRow[]; total: number }> {
  const yo = await getCurrentUserContext();
  if (!yo?.empresaId) return { rows: [], total: 0 };

  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 50;
  const offset   = ((filters.page ?? 1) - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("whatsapp_messages")
    .select("*, sent_by:sent_by_user_id(nombre, apellidos)", { count: "exact" })
    .eq("empresa_id", yo.empresaId)
    .order("sent_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Filtros de visibilidad por rol
  if (yo.role === "Agente") {
    query = query.eq("sent_by_user_id", yo.id);
  } else if (yo.role === "Responsable" && yo.supervisedAgentIds.length > 0) {
    query = query.in("sent_by_user_id", [yo.id, ...yo.supervisedAgentIds]);
  }

  if (filters.agenteId)   query = query.eq("sent_by_user_id", filters.agenteId);
  if (filters.estado)     query = query.eq("status", filters.estado);
  if (filters.tipo)       query = query.eq("related_type", filters.tipo);
  if (filters.fechaDesde) query = query.gte("sent_at", filters.fechaDesde);
  if (filters.fechaHasta) query = query.lte("sent_at", filters.fechaHasta);
  if (filters.busqueda) {
    query = query.or(`recipient_name.ilike.%${filters.busqueda}%,phone.ilike.%${filters.busqueda}%`);
  }

  const { data, count } = await query;

  const rows: ComunicacionesRow[] = (data ?? []).map((row: ComunicacionesRow & {
    sent_by: { nombre: string; apellidos: string } | null;
  }) => ({
    ...row,
    sent_by_name: row.sent_by
      ? `${row.sent_by.nombre} ${row.sent_by.apellidos}`.trim()
      : null,
  }));

  return { rows, total: count ?? 0 };
}

export type ComunicacionesMetrics = {
  totalHoy: number;
  totalSemana: number;
  totalMes: number;
  porEstado: Record<string, number>;
};

export async function getComunicacionesMetricsAction(): Promise<ComunicacionesMetrics> {
  const yo = await getCurrentUserContext();
  if (!yo?.empresaId) return { totalHoy: 0, totalSemana: 0, totalMes: 0, porEstado: {} };

  const supabase = await createClient();
  const now = new Date();
  const hoy    = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const semana = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const mes    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (supabase as any)
    .from("whatsapp_messages")
    .select("status, sent_at", { count: "exact" })
    .eq("empresa_id", yo.empresaId)
    .eq("direction", "outbound");

  const [{ data: allMes }, { count: countHoy }, { count: countSemana }] = await Promise.all([
    base.gte("sent_at", mes),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", yo.empresaId)
      .eq("direction", "outbound")
      .gte("sent_at", hoy),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", yo.empresaId)
      .eq("direction", "outbound")
      .gte("sent_at", semana),
  ]);

  const porEstado: Record<string, number> = {};
  for (const row of (allMes ?? []) as Array<{ status: string }>) {
    porEstado[row.status] = (porEstado[row.status] ?? 0) + 1;
  }

  return {
    totalHoy:    countHoy ?? 0,
    totalSemana: countSemana ?? 0,
    totalMes:    (allMes ?? []).length,
    porEstado,
  };
}

