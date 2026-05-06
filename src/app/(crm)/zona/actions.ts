"use server";

import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { canSetVendido } from "@/lib/roles";
import { revalidatePath } from "next/cache";

type PropiedadPayload = {
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
  estado: string | null;
  fecha_visita: string | null;
  notas: string | null;
  honorarios: number | null;
  agente_asignado: number | null;
  assigned_user_ids?: number[];
  latitud: number | null;
  longitud: number | null;
};

const PROPIEDAD_SELECT = "id, planta, puerta, propietario, telefono, estado, fecha_visita, notas, honorarios, agente_asignado, latitud, longitud, contactado, contactado_hasta, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos)";
const PROPIEDAD_SELECT_WITH_ASSIGNMENTS = `${PROPIEDAD_SELECT}, propiedad_usuarios(usuario_id, usuarios(id, nombre, apellidos))`;

export async function upsertPropiedadAction(
  payload: PropiedadPayload,
  fincaId: number,
  propiedadId?: number
): Promise<{ data?: Record<string, unknown>; error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };

  // Validar permiso para marcar como vendido
  if (payload.estado === "vendido") {
    const agenteAsignado = payload.agente_asignado;
    if (!canSetVendido(yo.role, agenteAsignado, yo.id, yo.supervisedAgentIds)) {
      return { error: "No tienes permiso para marcar esta propiedad como vendida." };
    }
  }

  const supabase = createAdminClient();
  const assignedUserIds = Array.from(new Set(
    (payload.assigned_user_ids?.length
      ? payload.assigned_user_ids
      : [payload.agente_asignado].filter((id): id is number => id != null)
    )
  ));
  const primaryAgentId = assignedUserIds[0] ?? payload.agente_asignado;
  const propiedadPayload: Omit<PropiedadPayload, "assigned_user_ids"> = {
    planta: payload.planta,
    puerta: payload.puerta,
    propietario: payload.propietario,
    telefono: payload.telefono,
    estado: payload.estado,
    fecha_visita: payload.fecha_visita,
    notas: payload.notas,
    honorarios: payload.honorarios,
    agente_asignado: payload.agente_asignado,
    latitud: payload.latitud,
    longitud: payload.longitud,
  };
  const patchPayload = {
    ...propiedadPayload,
    agente_asignado: primaryAgentId ?? null,
  };

  if (propiedadId) {
    const { error } = await supabase
      .from("propiedades")
      .update(patchPayload as never)
      .eq("id", propiedadId)
      .select("id")
      .single();

    if (error) return { error: error.message };
    const assignResult = await updatePropiedadUsuarios(supabase, propiedadId, assignedUserIds);
    if (assignResult.error) return { error: assignResult.error };
    const data = await getPropiedadWithUsers(supabase, propiedadId);
    if (data.error) return { error: data.error };
    revalidatePath(`/zona`);
    revalidatePath(`/dashboard`);
    return { data: data.row as Record<string, unknown> };
  } else {
    const createPayload = {
      ...patchPayload,
      finca_id: fincaId,
      agente_asignado: primaryAgentId ?? yo.id,
      owner_user_id: yo.id,
      empresa_id: yo.empresaId ?? null,
      equipo_id: yo.equipoId ?? null,
    };

    const { data, error } = await supabase
      .from("propiedades")
      .insert(createPayload as never)
      .select("id")
      .single();

    if (error) return { error: error.message };
    const propiedadId = Number(data.id);
    const assignResult = await updatePropiedadUsuarios(supabase, propiedadId, assignedUserIds.length ? assignedUserIds : [yo.id]);
    if (assignResult.error) return { error: assignResult.error };
    const created = await getPropiedadWithUsers(supabase, propiedadId);
    if (created.error) return { error: created.error };
    revalidatePath(`/zona`);
    revalidatePath(`/dashboard`);
    return { data: created.row as Record<string, unknown> };
  }
}

async function getPropiedadWithUsers(
  supabase: ReturnType<typeof createAdminClient>,
  propiedadId: number,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("propiedades")
    .select(PROPIEDAD_SELECT_WITH_ASSIGNMENTS)
    .eq("id", propiedadId)
    .single();

  if (error) {
    if (!isPropiedadUsuariosMissingError(error.message)) return { error: error.message };

    const fallback = await supabase
      .from("propiedades")
      .select(PROPIEDAD_SELECT)
      .eq("id", propiedadId)
      .single();
    if (fallback.error) return { error: fallback.error.message };
    return { row: fallback.data };
  }
  return { row: data };
}

function isPropiedadUsuariosMissingError(message: string | undefined) {
  if (!message) return false;
  return message.includes("propiedad_usuarios")
    || message.includes("Could not find a relationship")
    || message.includes("does not exist")
    || message.includes("schema cache");
}

async function updatePropiedadUsuarios(
  supabase: ReturnType<typeof createAdminClient>,
  propiedadId: number,
  assignedUserIds: number[],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentRows, error: readError } = await (supabase as any)
    .from("propiedad_usuarios")
    .select("usuario_id")
    .eq("propiedad_id", propiedadId);
  if (readError) {
    if (isPropiedadUsuariosMissingError(readError.message)) return {};
    return { error: readError.message };
  }

  const currentIds = ((currentRows ?? []) as Array<{ usuario_id: number }>).map((row) => row.usuario_id);
  const removedIds = currentIds.filter((id) => !assignedUserIds.includes(id));

  if (removedIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("propiedad_usuarios")
      .delete()
      .eq("propiedad_id", propiedadId)
      .in("usuario_id", removedIds);
    if (error) return { error: error.message };
  }

  if (assignedUserIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("propiedad_usuarios")
      .upsert(
        assignedUserIds.map((usuario_id) => ({ propiedad_id: propiedadId, usuario_id })),
        { onConflict: "propiedad_id,usuario_id" },
      );
    if (error) return { error: error.message };
  }

  return {};
}

export async function toggleContactadoAction(
  propiedadId: number,
  contactado: boolean,
  contactadoHasta?: string | null
): Promise<{ error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };
  const supabase = await createClient();

  const patch: Record<string, unknown> = { contactado };
  if (contactado && contactadoHasta) patch.contactado_hasta = contactadoHasta;
  if (!contactado) patch.contactado_hasta = null;

  let { error } = await supabase
    .from("propiedades")
    .update(patch as never)
    .eq("id", propiedadId);

  // Si falla por columna inexistente (migración pendiente), reintenta sin ella
  if (error && error.message?.includes("contactado_hasta")) {
    const { contactado_hasta: _ignored, ...patchSinColumna } = patch as Record<string, unknown> & { contactado_hasta?: unknown };
    const retry = await supabase
      .from("propiedades")
      .update(patchSinColumna as never)
      .eq("id", propiedadId);
    error = retry.error;
  }

  if (error) return { error: error.message };

  const admin = createAdminClient();
  if (contactado) {
    await admin.from("actividad_desarrollo").insert({
      agente_id: yo.id,
      actor_user_id: yo.id,
      empresa_id: yo.empresaId ?? null,
      equipo_id: yo.equipoId ?? null,
      metric: "contactos",
      action: "contactado",
      source_table: "propiedades",
      source_id: propiedadId,
      value: 1,
      occurred_at: new Date().toISOString(),
      metadata: {},
    } as never);
  } else {
    await admin
      .from("actividad_desarrollo")
      .delete()
      .eq("source_table", "propiedades")
      .eq("source_id", propiedadId)
      .eq("metric", "contactos");
  }

  return {};
}

// ── Orden personalizado por usuario ─────────────────────────────────────────
// Todas las posiciones se guardan en usuario_orden, no en las tablas originales.
// Así cada usuario tiene su propio orden sin afectar al resto.

type Tabla = "zona" | "sectores" | "fincas" | "propiedades";

async function upsertUserOrden(
  tabla: Tabla,
  positions: Array<{ id: number; posicion: number }>
): Promise<{ error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };
  const supabase = await createClient();
  const rows = positions.map(({ id, posicion }) => ({
    usuario_id: yo.id,
    tabla,
    item_id: id,
    posicion,
  }));
  const { error } = await supabase
    .from("usuario_orden")
    .upsert(rows, { onConflict: "usuario_id,tabla,item_id" }) as { error: { message: string } | null };
  if (error) return { error: error.message };
  return {};
}

async function deleteUserOrden(tabla: Tabla, ids: number[]): Promise<{ error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("usuario_orden")
    .delete()
    .eq("usuario_id", yo.id)
    .eq("tabla", tabla)
    .in("item_id", ids) as { error: { message: string } | null };
  if (error) return { error: error.message };
  return {};
}

export async function getUserOrdenAction(tabla: Tabla): Promise<Record<number, number>> {
  const yo = await getCurrentUserContext();
  if (!yo) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("usuario_orden")
    .select("item_id, posicion")
    .eq("usuario_id", yo.id)
    .eq("tabla", tabla) as { data: { item_id: number; posicion: number }[] | null };
  const map: Record<number, number> = {};
  for (const row of data ?? []) map[row.item_id] = row.posicion;
  return map;
}

export async function updateZonasPosicionesAction(
  positions: Array<{ id: number; posicion: number }>
): Promise<{ error?: string }> {
  return upsertUserOrden("zona", positions);
}

export async function updateSectoresPosicionesAction(
  positions: Array<{ id: number; posicion: number }>
): Promise<{ error?: string }> {
  return upsertUserOrden("sectores", positions);
}

export async function updateFincasPosicionesAction(
  positions: Array<{ id: number; posicion: number }>
): Promise<{ error?: string }> {
  return upsertUserOrden("fincas", positions);
}

export async function updatePropiedadesPosicionesAction(
  positions: Array<{ id: number; posicion: number }>
): Promise<{ error?: string }> {
  return upsertUserOrden("propiedades", positions);
}

export async function resetZonasPosicionesAction(ids: number[]): Promise<{ error?: string }> {
  return deleteUserOrden("zona", ids);
}

export async function resetSectoresPosicionesAction(ids: number[]): Promise<{ error?: string }> {
  return deleteUserOrden("sectores", ids);
}

export async function resetFincasPosicionesAction(ids: number[]): Promise<{ error?: string }> {
  return deleteUserOrden("fincas", ids);
}
