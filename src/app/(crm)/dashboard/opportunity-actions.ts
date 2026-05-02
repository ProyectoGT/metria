"use server";

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import type { LostOpportunity } from "@/lib/opportunities";

export type OpportunityActionResult = { ok: true } | { ok: false; error: string };

/**
 * Crea una tarea de seguimiento a partir de una oportunidad perdida
 * y registra el evento en el timeline.
 */
export async function createTaskFromOpportunityAction(
  opportunity: Pick<LostOpportunity, "id" | "titulo" | "razon" | "accion_recomendada" | "entidad" | "impacto">
): Promise<OpportunityActionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  // ── 1. Crear tarea ─────────────────────────────────────────────────────────
  const prioridad = opportunity.impacto === "alto" ? "alta" : opportunity.impacto === "medio" ? "media" : "baja";

  const { error: tareaError } = await supabase.rpc("create_pending_tarea", {
    p_titulo: opportunity.titulo,
    p_prioridad: prioridad,
    p_resultado: opportunity.accion_recomendada,
    p_completed: false,
    p_assigned_user_ids: [yo.id],
    p_visibility: "private",
  });

  if (tareaError) return { ok: false, error: tareaError.message };

  // ── 2. Registrar en timeline (según el tipo de entidad) ────────────────────
  const timelinePayload: Record<string, unknown> = {
    empresa_id: yo.empresaId,
    agente_id: yo.id,
    tipo_evento: "oportunidad_recuperada",
    titulo: `Oportunidad detectada: ${opportunity.titulo}`,
    descripcion: opportunity.accion_recomendada,
    metadata: {
      source: "lost_opportunity",
      opportunity_id: opportunity.id,
      opportunity_reason: opportunity.razon,
      entidad_type: opportunity.entidad.type,
      entidad_id: opportunity.entidad.id,
    },
  };

  if (opportunity.entidad.type === "pedido") timelinePayload.pedido_id = opportunity.entidad.id;
  if (opportunity.entidad.type === "propiedad") timelinePayload.propiedad_id = opportunity.entidad.id;
  if (opportunity.entidad.type === "contacto") timelinePayload.contacto_id = opportunity.entidad.id;

  // Para tipo "tarea" no hay un campo timeline específico; usamos solo metadata
  // pero necesitamos al menos un subject_check — usamos propiedad_id=null/pedido_id=null
  // que no satisface el constraint → insertamos solo si hay sujeto válido
  const hasSubject =
    opportunity.entidad.type === "pedido" ||
    opportunity.entidad.type === "propiedad" ||
    opportunity.entidad.type === "contacto";

  if (hasSubject) {
    await supabase.from("contacto_timeline_events").insert(timelinePayload);
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Descarta una oportunidad (solo local — el cliente la elimina de la vista).
 * Opcionalmente registra el descarte en el timeline para trazabilidad.
 */
export async function dismissOpportunityAction(
  opportunity: Pick<LostOpportunity, "id" | "razon" | "entidad">
): Promise<OpportunityActionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  const timelinePayload: Record<string, unknown> = {
    empresa_id: yo.empresaId,
    agente_id: yo.id,
    tipo_evento: "oportunidad_descartada",
    titulo: `Oportunidad descartada (${opportunity.razon})`,
    descripcion: `Entidad: ${opportunity.entidad.label}`,
    metadata: {
      source: "lost_opportunity",
      opportunity_id: opportunity.id,
      opportunity_reason: opportunity.razon,
    },
  };

  if (opportunity.entidad.type === "pedido") timelinePayload.pedido_id = opportunity.entidad.id;
  if (opportunity.entidad.type === "propiedad") timelinePayload.propiedad_id = opportunity.entidad.id;
  if (opportunity.entidad.type === "contacto") timelinePayload.contacto_id = opportunity.entidad.id;

  const hasSubject =
    opportunity.entidad.type === "pedido" ||
    opportunity.entidad.type === "propiedad" ||
    opportunity.entidad.type === "contacto";

  if (hasSubject) {
    await supabase.from("contacto_timeline_events").insert(timelinePayload);
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
