"use server";

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
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

  const supabase = await createClient();

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
