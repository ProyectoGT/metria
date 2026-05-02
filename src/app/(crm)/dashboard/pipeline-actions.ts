"use server";

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { revalidatePath } from "next/cache";

export type ResolveSuggestionResult = { ok: true } | { ok: false; error: string };

/**
 * Acepta una sugerencia de cambio de estado del pipeline.
 * - Actualiza estado de propiedad (si aplica)
 * - Registra evento en contacto_timeline_events
 * - Marca la sugerencia como aceptada
 * - Opcionalmente crea una tarea de seguimiento
 */
export async function acceptPipelineSuggestionAction(
  suggestionId: number,
  options?: { crearTarea?: boolean }
): Promise<ResolveSuggestionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  // Leer la sugerencia
  const { data: suggestion, error: readErr } = await supabase
    .from("pipeline_state_suggestions")
    .select("id, propiedad_id, pedido_id, agente_id, estado_actual, estado_sugerido, tipo_regla, razon, empresa_id")
    .eq("id", suggestionId)
    .eq("status", "pendiente")
    .single();

  if (readErr || !suggestion) return { ok: false, error: "Sugerencia no encontrada o ya resuelta" };

  // Verificar que pertenece a la misma empresa
  if (suggestion.empresa_id !== yo.empresaId) return { ok: false, error: "Sin acceso" };

  // ── 1. Actualizar estado de propiedad (solo si el sujeto es una propiedad y el estado es válido) ──
  const VALID_ESTADOS = ["neutral", "investigacion", "seguimiento", "noticia", "encargo", "vendido"];
  if (suggestion.propiedad_id && VALID_ESTADOS.includes(suggestion.estado_sugerido)) {
    const { error: propErr } = await supabase
      .from("propiedades")
      .update({ estado: suggestion.estado_sugerido })
      .eq("id", suggestion.propiedad_id);

    if (propErr) return { ok: false, error: `Error actualizando propiedad: ${propErr.message}` };
  }

  // ── 2. Registrar evento en timeline ────────────────────────────────────────
  const timelinePayload: Record<string, unknown> = {
    empresa_id: yo.empresaId,
    agente_id: yo.id,
    tipo_evento: "cambio_estado_pipeline",
    titulo: `Estado cambiado: ${suggestion.estado_actual} → ${suggestion.estado_sugerido}`,
    descripcion: suggestion.razon,
    metadata: {
      source: "pipeline_suggestion",
      suggestion_id: suggestionId,
      tipo_regla: suggestion.tipo_regla,
      estado_anterior: suggestion.estado_actual,
      estado_nuevo: suggestion.estado_sugerido,
    },
  };

  if (suggestion.propiedad_id) timelinePayload.propiedad_id = suggestion.propiedad_id;
  if (suggestion.pedido_id) timelinePayload.pedido_id = suggestion.pedido_id;

  // contacto_timeline_events requiere al menos uno de: contacto_id, pedido_id, propiedad_id
  // Si solo hay propiedad_id está cubierto (migration 20260503000004 amplió el constraint)
  const { error: timelineErr } = await supabase
    .from("contacto_timeline_events")
    .insert(timelinePayload);

  if (timelineErr) return { ok: false, error: `Error en timeline: ${timelineErr.message}` };

  // ── 3. Crear tarea de seguimiento opcional ─────────────────────────────────
  if (options?.crearTarea) {
    const label = suggestion.pedido_id ? `Seguimiento pedido #${suggestion.pedido_id}` : `Seguimiento propiedad #${suggestion.propiedad_id}`;
    await supabase.rpc("create_pending_tarea", {
      p_titulo: `${label} — ${suggestion.estado_sugerido}`,
      p_prioridad: "media",
      p_completed: false,
      p_assigned_user_ids: [yo.id],
      p_visibility: "private",
    });
  }

  // ── 4. Marcar sugerencia como aceptada ─────────────────────────────────────
  const { error: updateErr } = await supabase
    .from("pipeline_state_suggestions")
    .update({ status: "aceptada", resuelta_at: new Date().toISOString(), resuelta_por: yo.id })
    .eq("id", suggestionId);

  if (updateErr) return { ok: false, error: `Error marcando sugerencia: ${updateErr.message}` };

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Rechaza una sugerencia sin aplicar cambios de estado.
 * Registra el evento de rechazo en el timeline.
 */
export async function rejectPipelineSuggestionAction(
  suggestionId: number
): Promise<ResolveSuggestionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  const { data: suggestion, error: readErr } = await supabase
    .from("pipeline_state_suggestions")
    .select("id, propiedad_id, pedido_id, tipo_regla, razon, empresa_id")
    .eq("id", suggestionId)
    .eq("status", "pendiente")
    .single();

  if (readErr || !suggestion) return { ok: false, error: "Sugerencia no encontrada o ya resuelta" };
  if (suggestion.empresa_id !== yo.empresaId) return { ok: false, error: "Sin acceso" };

  // Registrar rechazo en timeline
  const timelinePayload: Record<string, unknown> = {
    empresa_id: yo.empresaId,
    agente_id: yo.id,
    tipo_evento: "cambio_estado_pipeline",
    titulo: `Sugerencia rechazada: ${suggestion.tipo_regla}`,
    descripcion: suggestion.razon,
    metadata: {
      source: "pipeline_suggestion",
      suggestion_id: suggestionId,
      tipo_regla: suggestion.tipo_regla,
      action: "rechazada",
    },
  };
  if (suggestion.propiedad_id) timelinePayload.propiedad_id = suggestion.propiedad_id;
  if (suggestion.pedido_id) timelinePayload.pedido_id = suggestion.pedido_id;

  await supabase.from("contacto_timeline_events").insert(timelinePayload);

  const { error: updateErr } = await supabase
    .from("pipeline_state_suggestions")
    .update({ status: "rechazada", resuelta_at: new Date().toISOString(), resuelta_por: yo.id })
    .eq("id", suggestionId);

  if (updateErr) return { ok: false, error: `Error marcando sugerencia: ${updateErr.message}` };

  revalidatePath("/dashboard");
  return { ok: true };
}
