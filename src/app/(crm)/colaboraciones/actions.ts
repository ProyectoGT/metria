"use server";

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { revalidatePath } from "next/cache";

export type ColaboracionEntidadTipo = "pedido" | "propiedad" | "contacto";
export type ColaboracionEstado = "pendiente" | "aceptada" | "rechazada" | "cancelada";

export type ColaboracionActionResult =
  | { ok: true; id?: number }
  | { ok: false; error: string };

// ─── Helpers internos ──────────────────────────────────────────────────────────

async function registrarTimeline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  yo: { id: number; empresaId: number | null },
  entidad_tipo: ColaboracionEntidadTipo,
  entidad_id: number,
  titulo: string,
  descripcion: string,
  meta: Record<string, unknown>
) {
  const payload: Record<string, unknown> = {
    empresa_id: yo.empresaId,
    agente_id: yo.id,
    tipo_evento: "colaboracion",
    titulo,
    descripcion,
    metadata: meta,
  };
  if (entidad_tipo === "pedido") payload.pedido_id = entidad_id;
  if (entidad_tipo === "propiedad") payload.propiedad_id = entidad_id;
  if (entidad_tipo === "contacto") payload.contacto_id = entidad_id;

  // La constraint de timeline requiere al menos un sujeto — propiedad está OK sin constraint
  // Para contacto necesitamos contacto_id; para propiedad usamos propiedad_id sin pedido_id
  // La migración 20260503000004 ya relaja el check a: contacto OR pedido OR propiedad
  await supabase.from("contacto_timeline_events").insert(payload);
}

// ─── Invitar colaborador ────────────────────────────────────────────────────────

export async function invitarColaboradorAction(data: {
  entidad_tipo: ColaboracionEntidadTipo;
  entidad_id: number;
  colaborador_id: number;
  porcentaje_comision?: number | null;
  notas?: string | null;
}): Promise<ColaboracionActionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  if (data.colaborador_id === yo.id)
    return { ok: false, error: "No puedes invitarte a ti mismo" };

  // Verificar que no existe ya una colaboración activa
  const { data: existing } = await supabase
    .from("colaboraciones")
    .select("id, estado")
    .eq("entidad_tipo", data.entidad_tipo)
    .eq("entidad_id", data.entidad_id)
    .eq("agente_owner_id", yo.id)
    .eq("agente_colaborador_id", data.colaborador_id)
    .in("estado", ["pendiente", "aceptada"])
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: existing.estado === "pendiente"
        ? "Ya hay una invitacion pendiente con este agente"
        : "Este agente ya es colaborador activo",
    };
  }

  const { data: row, error } = await supabase
    .from("colaboraciones")
    .insert({
      empresa_id: yo.empresaId,
      entidad_tipo: data.entidad_tipo,
      entidad_id: data.entidad_id,
      agente_owner_id: yo.id,
      agente_colaborador_id: data.colaborador_id,
      estado: "pendiente",
      porcentaje_comision: data.porcentaje_comision ?? null,
      notas: data.notas?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Timeline
  const { data: colab } = await supabase
    .from("usuarios")
    .select("nombre, apellidos")
    .eq("id", data.colaborador_id)
    .single();
  const colabNombre = colab ? `${colab.nombre} ${colab.apellidos}`.trim() : `#${data.colaborador_id}`;

  await registrarTimeline(
    supabase, yo, data.entidad_tipo, data.entidad_id,
    `Invitacion de colaboracion enviada a ${colabNombre}`,
    data.notas || "Sin notas adicionales.",
    { source: "colaboracion", colaboracion_id: row.id, action: "invitado", colaborador: colabNombre }
  );

  revalidatePath("/solicitudes");
  revalidatePath("/zona");
  return { ok: true, id: row.id };
}

// ─── Aceptar colaboración ──────────────────────────────────────────────────────

export async function aceptarColaboracionAction(colaboracionId: number): Promise<ColaboracionActionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  const { data: col, error: readErr } = await supabase
    .from("colaboraciones")
    .select("id, entidad_tipo, entidad_id, agente_owner_id, agente_colaborador_id, empresa_id")
    .eq("id", colaboracionId)
    .eq("estado", "pendiente")
    .single();

  if (readErr || !col) return { ok: false, error: "Colaboracion no encontrada o ya resuelta" };
  if (col.agente_colaborador_id !== yo.id) return { ok: false, error: "Solo el colaborador puede aceptar" };

  const { error } = await supabase
    .from("colaboraciones")
    .update({ estado: "aceptada" })
    .eq("id", colaboracionId);

  if (error) return { ok: false, error: error.message };

  const { data: owner } = await supabase.from("usuarios").select("nombre, apellidos").eq("id", col.agente_owner_id).single();
  const ownerNombre = owner ? `${owner.nombre} ${owner.apellidos}`.trim() : `#${col.agente_owner_id}`;

  await registrarTimeline(
    supabase, yo, col.entidad_tipo, col.entidad_id,
    `Colaboracion aceptada con ${ownerNombre}`,
    "El agente ha aceptado la invitacion de colaboracion.",
    { source: "colaboracion", colaboracion_id: colaboracionId, action: "aceptada" }
  );

  revalidatePath("/solicitudes");
  revalidatePath("/zona");
  return { ok: true };
}

// ─── Rechazar colaboración ─────────────────────────────────────────────────────

export async function rechazarColaboracionAction(colaboracionId: number): Promise<ColaboracionActionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  const { data: col, error: readErr } = await supabase
    .from("colaboraciones")
    .select("id, entidad_tipo, entidad_id, agente_owner_id, agente_colaborador_id")
    .eq("id", colaboracionId)
    .eq("estado", "pendiente")
    .single();

  if (readErr || !col) return { ok: false, error: "Colaboracion no encontrada o ya resuelta" };
  if (col.agente_colaborador_id !== yo.id) return { ok: false, error: "Solo el colaborador puede rechazar" };

  const { error } = await supabase
    .from("colaboraciones")
    .update({ estado: "rechazada" })
    .eq("id", colaboracionId);

  if (error) return { ok: false, error: error.message };

  await registrarTimeline(
    supabase, yo, col.entidad_tipo, col.entidad_id,
    "Invitacion de colaboracion rechazada",
    "El agente ha rechazado la invitacion.",
    { source: "colaboracion", colaboracion_id: colaboracionId, action: "rechazada" }
  );

  revalidatePath("/solicitudes");
  revalidatePath("/zona");
  return { ok: true };
}

// ─── Cancelar colaboración (solo owner) ───────────────────────────────────────

export async function cancelarColaboracionAction(colaboracionId: number): Promise<ColaboracionActionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  const { data: col, error: readErr } = await supabase
    .from("colaboraciones")
    .select("id, entidad_tipo, entidad_id, agente_owner_id, agente_colaborador_id, empresa_id")
    .eq("id", colaboracionId)
    .in("estado", ["pendiente", "aceptada"])
    .single();

  if (readErr || !col) return { ok: false, error: "Colaboracion no encontrada o ya cerrada" };

  const isAdmin = yo.role === "Administrador" || yo.role === "Director";
  if (col.agente_owner_id !== yo.id && !isAdmin)
    return { ok: false, error: "Solo el owner o un administrador puede cancelar" };

  const { error } = await supabase
    .from("colaboraciones")
    .update({ estado: "cancelada" })
    .eq("id", colaboracionId);

  if (error) return { ok: false, error: error.message };

  const { data: colab } = await supabase.from("usuarios").select("nombre, apellidos").eq("id", col.agente_colaborador_id).single();
  const colabNombre = colab ? `${colab.nombre} ${colab.apellidos}`.trim() : `#${col.agente_colaborador_id}`;

  await registrarTimeline(
    supabase, yo, col.entidad_tipo, col.entidad_id,
    `Colaboracion cancelada con ${colabNombre}`,
    "El owner ha cancelado la colaboracion.",
    { source: "colaboracion", colaboracion_id: colaboracionId, action: "cancelada", colaborador: colabNombre }
  );

  revalidatePath("/solicitudes");
  revalidatePath("/zona");
  return { ok: true };
}
