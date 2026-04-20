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
  latitud: number | null;
  longitud: number | null;
};

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

  if (propiedadId) {
    const { data, error } = await supabase
      .from("propiedades")
      .update(payload as never)
      .eq("id", propiedadId)
      .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos)")
      .single();

    if (error) return { error: error.message };
    revalidatePath(`/zona`);
    return { data: data as Record<string, unknown> };
  } else {
    const { data, error } = await supabase
      .from("propiedades")
      .insert({ ...payload, finca_id: fincaId } as never)
      .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos)")
      .single();

    if (error) return { error: error.message };
    revalidatePath(`/zona`);
    return { data: data as Record<string, unknown> };
  }
}

export async function toggleContactadoAction(
  propiedadId: number,
  contactado: boolean
): Promise<{ error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("propiedades")
    .update({ contactado } as never)
    .eq("id", propiedadId);
  if (error) return { error: error.message };
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
