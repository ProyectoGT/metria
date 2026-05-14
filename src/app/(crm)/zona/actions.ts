"use server";

import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { requirePermission } from "@/lib/access-control";
import { canBeAssignedProperty, canSetVendido } from "@/lib/roles";
import { revalidatePath } from "next/cache";

type PropiedadPayload = {
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
  propietario_secundario: string | null;
  telefono_secundario: string | null;
  estado: string | null;
  fecha_visita: string | null;
  notas: string | null;
  honorarios: number | null;
  agente_asignado: number | null;
  latitud: number | null;
  longitud: number | null;
};

function shouldRetryWithoutSecondOwner(payload: PropiedadPayload, error: { message?: string; code?: string } | null) {
  if (payload.propietario_secundario || payload.telefono_secundario) return false;
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST204" || message.includes("propietario_secundario") || message.includes("telefono_secundario");
}

function stripSecondOwner<T extends PropiedadPayload>(payload: T) {
  const rest: Partial<T> = { ...payload };
  delete rest.propietario_secundario;
  delete rest.telefono_secundario;
  return rest;
}

export async function upsertPropiedadAction(
  payload: PropiedadPayload,
  fincaId: number,
  propiedadId?: number
): Promise<{ data?: Record<string, unknown>; error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };

  const permError = await requirePermission("update", "propiedades").then(() => null).catch((e: Error) => e.message);
  if (permError) return { error: permError };

  const assignedAgentError = await validateAssignablePropertyAgent(payload.agente_asignado, yo.empresaId, yo.role);
  if (assignedAgentError) return { error: assignedAgentError };

  // Validar permiso para marcar como vendido
  if (payload.estado === "vendido") {
    const agenteAsignado = payload.agente_asignado;
    if (!canSetVendido(yo.role, agenteAsignado, yo.id, yo.supervisedAgentIds)) {
      return { error: "No tienes permiso para marcar esta propiedad como vendida." };
    }
  }

  // Usar cliente con RLS — las policies de propiedades gestionan el acceso.
  // Para updates: RLS propiedades_update_scoped ya valida ownership + empresa.
  // Para inserts: RLS propiedades_insert_scoped ya valida empresa_id = current.
  const supabase = yo.role === "Administrador" ? createAdminClient() : await createClient();

  if (propiedadId) {
    // Verificar explícitamente que la propiedad pertenece a la empresa del usuario
    // como segunda capa defensiva (RLS también lo hace).
    const { data: existing } = await supabase
      .from("propiedades")
      .select("empresa_id, created_by_user_id")
      .eq("id", propiedadId)
      .single();

    if (!existing) return { error: "Propiedad no encontrada o sin acceso." };
    if (yo.role !== "Administrador" && existing.empresa_id !== yo.empresaId) return { error: "Sin acceso a esta propiedad." };

    let { data, error } = await supabase
      .from("propiedades")
      .update(payload as never)
      .eq("id", propiedadId)
      .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos, rol), creador:usuarios!propiedades_created_by_user_id_fkey(id, nombre, apellidos, rol)")
      .single();

    if (error && shouldRetryWithoutSecondOwner(payload, error)) {
      const retry = await supabase
        .from("propiedades")
        .update(stripSecondOwner(payload) as never)
        .eq("id", propiedadId)
        .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos, rol), creador:usuarios!propiedades_created_by_user_id_fkey(id, nombre, apellidos, rol)")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) return { error: error.message };
    revalidatePath(`/zona`);
    revalidatePath(`/dashboard`);
    return { data: data as Record<string, unknown> };
  } else {
    const createPayload = {
      ...payload,
      finca_id: fincaId,
      agente_asignado: payload.agente_asignado,
      created_by_user_id: yo.id,
      owner_user_id: yo.id,
      empresa_id: yo.empresaId ?? null,
      equipo_id: yo.equipoId ?? null,
    };

    let { data, error } = await supabase
      .from("propiedades")
      .insert(createPayload as never)
      .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos, rol), creador:usuarios!propiedades_created_by_user_id_fkey(id, nombre, apellidos, rol)")
      .single();

    if (error && shouldRetryWithoutSecondOwner(payload, error)) {
      const retry = await supabase
        .from("propiedades")
        .insert(stripSecondOwner(createPayload) as never)
        .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos, rol), creador:usuarios!propiedades_created_by_user_id_fkey(id, nombre, apellidos, rol)")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) return { error: error.message };
    revalidatePath(`/zona`);
    revalidatePath(`/dashboard`);
    return { data: data as Record<string, unknown> };
  }
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
    const patchSinColumna = { ...patch };
    delete patchSinColumna.contactado_hasta;
    const retry = await supabase
      .from("propiedades")
      .update(patchSinColumna as never)
      .eq("id", propiedadId);
    error = retry.error;
  }

  if (error) return { error: error.message };

  // actividad_desarrollo requiere admin client: la tabla tiene RLS con policy SELECT
  // pero no tiene política INSERT/DELETE explícita, por lo que solo puede escribirse
  // via service role o funciones security definer. No expone datos de terceros porque
  // agente_id y empresa_id siempre se fijan con los valores del usuario autenticado.
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
      .eq("metric", "contactos")
      .eq("agente_id", yo.id); // nunca borrar actividad de otros agentes
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

async function validateAssignablePropertyAgent(
  agenteId: number | null,
  empresaId: number | null,
  currentUserRole: string
): Promise<string | null> {
  if (!agenteId) return "Selecciona un agente valido para esta propiedad.";

  const supabase = currentUserRole === "Administrador" ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, rol, empresa_id")
    .eq("id", agenteId)
    .maybeSingle();

  if (error) return error.message;
  if (!data) return "El agente asignado no existe o no esta disponible.";
  if (currentUserRole !== "Administrador" && empresaId != null && data.empresa_id !== empresaId) return "El agente asignado no pertenece a tu empresa.";
  if (!canBeAssignedProperty(data.rol)) {
    return "Los usuarios administradores no pueden tener propiedades asignadas. Selecciona un agente para esta propiedad.";
  }

  return null;
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
