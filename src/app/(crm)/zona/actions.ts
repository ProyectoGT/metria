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

export async function updatePropiedadesPosicionesAction(
  positions: Array<{ id: number; posicion: number }>
): Promise<{ error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };

  const supabase = await createClient();

  const updates = await Promise.all(
    positions.map(({ id, posicion }) =>
      supabase.from("propiedades").update({ posicion }).eq("id", id)
    )
  );

  const failed = updates.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  return {};
}
