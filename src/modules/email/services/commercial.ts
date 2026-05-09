import type { SupabaseClient } from "@supabase/supabase-js";
import { detectEmailIntent, detectPortalSource, scoreCommercialEmail } from "./rules";

type Message = {
  id: number;
  empresa_id: number | null;
  user_id?: number;
  subject?: string | null;
  from_email?: string | null;
  from_name?: string | null;
  body_text?: string | null;
  snippet?: string | null;
  direction?: "inbound" | "outbound";
  is_read?: boolean;
  has_attachments?: boolean;
  received_at?: string | null;
};

function firstIntent(intents: string[]) {
  return intents[0] ?? null;
}

function extractEmail(text: string) {
  return text.match(/\b[\w.+%-]+@[\w-]+\.[\w.]{2,}\b/)?.[0]?.toLowerCase() ?? null;
}

function extractPhone(text: string) {
  return text.match(/(?:\+34[\s.-]?)?(?:[6-9]\d{2})[\s.-]?\d{3}[\s.-]?\d{3}/)?.[0]?.replace(/[\s.-]/g, "") ?? null;
}

function extractReference(text: string) {
  return text.match(/(?:ref(?:erencia)?\.?\s*[:\-]?\s*)([A-Z0-9-]{4,})/i)?.[1] ?? null;
}

function leadName(message: Message) {
  if (message.from_name?.trim()) return message.from_name.trim();
  const email = message.from_email?.split("@")[0]?.replace(/[._-]+/g, " ") ?? "";
  return email ? email.replace(/\b\w/g, (char) => char.toUpperCase()) : "Lead email";
}

export async function capturePortalLead(
  supabase: SupabaseClient,
  message: Message,
  portalSource: string | null,
) {
  if (!portalSource || !message.empresa_id || message.direction !== "inbound") return { leadId: null, createdTask: false };

  const text = `${message.subject ?? ""}\n${message.snippet ?? ""}\n${message.body_text ?? ""}`;
  const email = extractEmail(text) ?? message.from_email ?? null;
  const telefono = extractPhone(text);
  const referencia = extractReference(text);
  const nombre = leadName(message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingLead } = await (supabase as any)
    .from("idealista_leads")
    .select("id")
    .or([
      email ? `email_contacto.eq.${email}` : "",
      telefono ? `telefono.eq.${telefono}` : "",
      referencia ? `referencia.eq.${referencia}` : "",
    ].filter(Boolean).join(","))
    .maybeSingle();

  let leadId = existingLead?.id ?? null;
  if (!leadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedLead } = await (supabase as any)
      .from("idealista_leads")
      .insert({
        gmail_message_id: `email-${message.id}`,
        empresa_id: message.empresa_id,
        nombre,
        email_contacto: email,
        telefono,
        referencia,
        asunto: message.subject ?? `Lead ${portalSource}`,
        mensaje: (message.body_text ?? message.snippet ?? "").slice(0, 1000),
        fecha_contacto: message.received_at ?? new Date().toISOString(),
        estado: "nuevo",
      })
      .select("id")
      .single();
    leadId = insertedLead?.id ?? null;
  }

  let existingContact: { id: number } | null = null;
  if (email || telefono) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("contactos")
        .select("id")
        .or([email ? `email.eq.${email}` : "", telefono ? `telefono.eq.${telefono}` : ""].filter(Boolean).join(","))
        .maybeSingle();
    existingContact = data;
  }

  if (!existingContact) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("contactos").insert({
      nombre,
      email,
      telefono,
      tipo: "cliente",
      origen: portalSource,
      estado: "activo",
      visibility: "private",
    });
  }

  let existingPedido: { id: number } | null = null;
  if (telefono || referencia) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("pedidos")
        .select("id")
        .or([telefono ? `telefono.eq.${telefono}` : "", referencia ? `referencia.eq.${referencia}` : ""].filter(Boolean).join(","))
        .maybeSingle();
    existingPedido = data;
  }

  if (!existingPedido) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("pedidos").insert({
      nombre_cliente: nombre,
      telefono,
      origen: portalSource,
      referencia,
      notas: (message.body_text ?? message.snippet ?? "").slice(0, 1000),
      visibility: "private",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc("create_pending_tarea", {
    p_titulo: `Responder lead ${portalSource}: ${nombre}`,
    p_prioridad: "alta",
    p_completed: false,
    p_assigned_user_ids: message.user_id ? [message.user_id] : undefined,
    p_visibility: "private",
  });

  if (leadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("email_messages")
      .update({ captured_lead_id: leadId })
      .eq("id", message.id);
  }

  return { leadId, createdTask: true };
}

export async function enrichCommercialEmail(
  supabase: SupabaseClient,
  message: Message,
) {
  const { intents, urgent } = detectEmailIntent(message);
  const portalSource = detectPortalSource(message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: links } = await (supabase as any)
    .from("email_entity_links")
    .select("entity_type")
    .eq("email_message_id", message.id);

  const linkTypes = (links ?? []).map((link: { entity_type: string }) => link.entity_type);
  const commercial = scoreCommercialEmail({
    direction: message.direction ?? "inbound",
    isRead: message.is_read ?? false,
    hasAttachments: message.has_attachments ?? false,
    linkTypes,
    intent: firstIntent(intents),
    urgent,
    portalSource,
  });

  const responseDueAt = commercial.responseHours
    ? new Date(Date.now() + commercial.responseHours * 60 * 60 * 1000).toISOString()
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("email_messages")
    .update({
      commercial_priority: commercial.priority,
      commercial_bucket: commercial.bucket,
      urgency: commercial.urgency,
      intent: firstIntent(intents),
      needs_response: commercial.needsResponse,
      response_due_at: responseDueAt,
      portal_source: portalSource,
    })
    .eq("id", message.id);

  if (commercial.needsResponse && responseDueAt) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_alerts").upsert({
      empresa_id: message.empresa_id,
      user_id: message.user_id,
      email_message_id: message.id,
      alert_type: commercial.bucket === "property_owner" ? "property_owner" : "needs_response",
      title: commercial.bucket === "property_owner" ? "Propietario pendiente" : "Email pendiente de respuesta",
      description: message.subject ?? message.snippet ?? null,
      severity: commercial.urgency === "urgent" ? "high" : "medium",
      due_at: responseDueAt,
      status: "open",
    }, { onConflict: "email_message_id,alert_type" });
  }

  await capturePortalLead(supabase, message, portalSource);

  return commercial;
}

export async function createClientNoReplyAlerts(supabase: SupabaseClient, userId: number) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outbound } = await (supabase as any)
    .from("email_messages")
    .select("id,empresa_id,user_id,provider_thread_id,subject,sent_at")
    .eq("user_id", userId)
    .eq("direction", "outbound")
    .lt("sent_at", cutoff)
    .limit(50);

  for (const message of outbound ?? []) {
    if (!message.provider_thread_id) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: replies } = await (supabase as any)
      .from("email_messages")
      .select("id")
      .eq("user_id", userId)
      .eq("provider_thread_id", message.provider_thread_id)
      .eq("direction", "inbound")
      .gt("received_at", message.sent_at)
      .limit(1);

    if ((replies ?? []).length > 0) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_alerts").upsert({
      empresa_id: message.empresa_id,
      user_id: message.user_id,
      email_message_id: message.id,
      alert_type: "client_no_reply",
      title: "Cliente sin respuesta",
      description: message.subject ?? "Email enviado sin respuesta en 48h.",
      severity: "medium",
      due_at: new Date().toISOString(),
      status: "open",
    }, { onConflict: "email_message_id,alert_type" });
  }
}
