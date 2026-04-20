"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { canViewAllAgents } from "@/lib/roles";
import { DEFAULT_OBJECTIVES, type RendimientoPeriodo } from "@/lib/desarrollo-metrics";

type UpdateObjetivosInput = {
  agenteId: number;
  anio: number;
  mes: number; // 1-12 = mes concreto; 0 = aplicar a todos los meses del año
  objetivo_facturado: number;   // valor mensual (si mes=0, se usa como mensual × 12 → ya dividido por llamante)
  objetivo_encargos: number;
  objetivo_ventas: number;
  objetivo_contactos: number;
};

function nonNegative(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

async function upsertRendimiento(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  agenteId: number,
  anio: number,
  mes: number,
  objectives: {
    objetivo_facturado: number;
    objetivo_encargos: number;
    objetivo_ventas: number;
    objetivo_contactos: number;
  },
): Promise<RendimientoPeriodo> {
  const { data: existing } = await supabase
    .from("rendimiento")
    .select("id")
    .eq("agente_id", agenteId)
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();

  const query = existing
    ? supabase.from("rendimiento").update(objectives).eq("id", existing.id).select().single()
    : supabase.from("rendimiento").insert({
        agente_id: agenteId,
        anio,
        mes,
        facturado: 0,
        encargos: 0,
        ventas: 0,
        contactos: 0,
        ...objectives,
      }).select().single();

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as RendimientoPeriodo;
}

export async function updateObjetivosRendimientoAction(
  input: UpdateObjetivosInput,
): Promise<RendimientoPeriodo[]> {
  const supabase = await createClient();
  const currentUser = await getCurrentUserContext();

  if (!currentUser) throw new Error("No autenticado");
  if (!canViewAllAgents(currentUser.role)) throw new Error("No tienes permisos para modificar objetivos.");

  const agenteId = Number(input.agenteId);
  const anio     = Number(input.anio);
  const mes      = Number(input.mes);

  if (!Number.isInteger(agenteId) || !Number.isInteger(anio) || !Number.isInteger(mes)) {
    throw new Error("Periodo u agente no valido.");
  }
  if (mes < 0 || mes > 12) throw new Error("Mes no valido.");

  const { data: targetUser } = await supabase
    .from("usuarios")
    .select("id, empresa_id")
    .eq("id", agenteId)
    .maybeSingle();

  if (!targetUser || targetUser.empresa_id !== currentUser.empresaId) {
    throw new Error("No puedes modificar objetivos de este usuario.");
  }

  const objectives = {
    objetivo_facturado: nonNegative(input.objetivo_facturado, DEFAULT_OBJECTIVES.objetivo_facturado),
    objetivo_encargos:  nonNegative(input.objetivo_encargos,  DEFAULT_OBJECTIVES.objetivo_encargos),
    objetivo_ventas:    nonNegative(input.objetivo_ventas,    DEFAULT_OBJECTIVES.objetivo_ventas),
    objetivo_contactos: nonNegative(input.objetivo_contactos, DEFAULT_OBJECTIVES.objetivo_contactos),
  };

  const results: RendimientoPeriodo[] = [];

  if (mes === 0) {
    // Vista anual: guardar los mismos objetivos en los 12 meses
    for (let m = 1; m <= 12; m++) {
      const row = await upsertRendimiento(supabase, agenteId, anio, m, objectives);
      results.push(row);
    }
  } else {
    const row = await upsertRendimiento(supabase, agenteId, anio, mes, objectives);
    results.push(row);
  }

  revalidatePath("/desarrollo");
  revalidatePath("/dashboard");
  return results;
}
