import type { SupabaseClient } from "@supabase/supabase-js";

type MessageForLinking = {
  id: number;
  empresa_id: number | null;
  subject?: string | null;
  from_email?: string | null;
  body_text?: string | null;
  snippet?: string | null;
};

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function digits(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

export async function linkEmailMessageToEntities(
  supabase: SupabaseClient,
  message: MessageForLinking,
) {
  const text = normalize(`${message.subject ?? ""} ${message.snippet ?? ""} ${message.body_text ?? ""}`);
  const phoneText = digits(text);
  const links: Array<{
    empresa_id: number | null;
    email_message_id: number;
    entity_type: "contacto" | "pedido" | "propiedad" | "lead";
    entity_id: number;
    confidence_score: number;
    linked_by: "system";
  }> = [];

  if (message.from_email) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contactos } = await (supabase as any)
      .from("contactos")
      .select("id,email,nombre,telefono")
      .or(`email.ilike.${message.from_email},telefono.not.is.null`)
      .limit(8);

    for (const contacto of contactos ?? []) {
      const emailMatch = normalize(contacto.email) === normalize(message.from_email);
      const phone = digits(contacto.telefono);
      if (emailMatch || (phone.length >= 9 && phoneText.includes(phone))) {
        links.push({
          empresa_id: message.empresa_id,
          email_message_id: message.id,
          entity_type: "contacto",
          entity_id: contacto.id,
          confidence_score: emailMatch ? 0.96 : 0.74,
          linked_by: "system",
        });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pedidos } = await (supabase as any)
    .from("pedidos")
    .select("id,nombre_cliente,telefono,referencia")
    .limit(100);

  for (const pedido of pedidos ?? []) {
    const ref = normalize(pedido.referencia);
    const phone = digits(pedido.telefono);
    const name = normalize(pedido.nombre_cliente);
    if ((ref && text.includes(ref)) || (phone.length >= 9 && phoneText.includes(phone)) || (name.length > 4 && text.includes(name))) {
      links.push({
        empresa_id: message.empresa_id,
        email_message_id: message.id,
        entity_type: "pedido",
        entity_id: pedido.id,
        confidence_score: ref && text.includes(ref) ? 0.9 : 0.68,
        linked_by: "system",
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: propiedades } = await (supabase as any)
    .from("propiedades")
    .select("id,propietario,telefono")
    .limit(100);

  for (const propiedad of propiedades ?? []) {
    const owner = normalize(propiedad.propietario);
    const phone = digits(propiedad.telefono);
    if ((owner.length > 4 && text.includes(owner)) || (phone.length >= 9 && phoneText.includes(phone))) {
      links.push({
        empresa_id: message.empresa_id,
        email_message_id: message.id,
        entity_type: "propiedad",
        entity_id: propiedad.id,
        confidence_score: phone.length >= 9 && phoneText.includes(phone) ? 0.78 : 0.64,
        linked_by: "system",
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leads } = await (supabase as any)
    .from("idealista_leads")
    .select("id,email_contacto,telefono,referencia")
    .limit(100);

  for (const lead of leads ?? []) {
    const emailMatch = normalize(lead.email_contacto) && normalize(lead.email_contacto) === normalize(message.from_email);
    const ref = normalize(lead.referencia);
    const phone = digits(lead.telefono);
    if (emailMatch || (ref && text.includes(ref)) || (phone.length >= 9 && phoneText.includes(phone))) {
      links.push({
        empresa_id: message.empresa_id,
        email_message_id: message.id,
        entity_type: "lead",
        entity_id: lead.id,
        confidence_score: emailMatch ? 0.94 : 0.72,
        linked_by: "system",
      });
    }
  }

  if (links.length === 0) return { linked: 0 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("email_entity_links")
    .upsert(links, { onConflict: "email_message_id,entity_type,entity_id" });

  if (error) throw error;
  return { linked: links.length };
}
