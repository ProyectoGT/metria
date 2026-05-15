"use server";

// Fases 2 y 3: matching bidireccional propiedad↔compradores y solicitud↔propiedades

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { formatModalidadPedido } from "@/modules/solicitudes/services/modalidades";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BuyerMatch = {
  id: number;
  nombre_cliente: string;
  telefono: string;
  presupuesto: number | null;
  zona_busqueda: string | null;
  zona_nombre: string | null;
  zona_id: number | null;
  tipo_propiedad: string | null;
  modalidad: string | null;
  habitaciones: number | null;
  garaje: boolean | null;
  score: number;
  score_presupuesto: boolean;
  score_zona: boolean;
  score_modalidad: boolean;
};

export type PropertyMatch = {
  id: number;
  titulo: string | null;
  propietario: string | null;
  precio: number | null;
  estado: string | null;
  tipo_operacion: string | null;
  zona_nombre: string | null;
  zona_id: number | null;
  finca_id: number | null;
  sector_id: number | null;
  score: number;
  score_presupuesto: boolean;
  score_zona: boolean;
  score_modalidad: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isModalidadCompatible(
  modalidad: string | null,
  tipo_operacion: string | null
): boolean {
  if (!modalidad || !tipo_operacion) return true;
  switch (modalidad) {
    case "CV":
    case "CH":
    case "CONTADO":
      return tipo_operacion === "venta" || tipo_operacion === "venta_alquiler";
    case "ALQ":
      return tipo_operacion === "alquiler" || tipo_operacion === "venta_alquiler";
    default:
      return true;
  }
}

// ─── Fase 2: propiedad → compradores compatibles ──────────────────────────────

export async function findCompatibleBuyersAction(propiedadId: number): Promise<BuyerMatch[]> {
  const yo = await getCurrentUserContext();
  if (!yo?.empresaId) return [];

  const supabase = await createClient();

  // Cargar datos de la propiedad necesarios para matching
  const { data: prop } = await supabase
    .from("propiedades")
    .select("precio, tipo_operacion, finca_id, empresa_id, fincas(sectores(zona(id, nombre)))")
    .eq("id", propiedadId)
    .maybeSingle();

  if (!prop || prop.empresa_id !== yo.empresaId) return [];

  type PropRaw = typeof prop & {
    fincas: { sectores: { zona: { id: number; nombre: string } | null } | null } | null;
  };
  const propRaw = prop as unknown as PropRaw;
  const propZonaId = propRaw.fincas?.sectores?.zona?.id ?? null;

  // Obtener pedidos activos con teléfono de la misma empresa
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, nombre_cliente, telefono, presupuesto, zona_deseada, zona_busqueda, tipo_propiedad, modalidad, habitaciones, garaje, zona:zona_deseada(id, nombre)"
    )
    .eq("empresa_id", yo.empresaId)
    .not("telefono", "is", null)
    .order("presupuesto", { ascending: false });

  type PedidoRow = {
    id: number;
    nombre_cliente: string;
    telefono: string | null;
    presupuesto: number | null;
    zona_deseada: number | null;
    zona_busqueda: string | null;
    tipo_propiedad: string | null;
    modalidad: string | null;
    habitaciones: number | null;
    garaje: boolean | null;
    zona: { id: number; nombre: string | null } | null;
  };

  const results: BuyerMatch[] = [];

  for (const p of (pedidos ?? []) as unknown as PedidoRow[]) {
    if (!p.telefono) continue;

    // Presupuesto >= precio (40 pts) — si no tiene presupuesto, pasa como flexible (20 pts)
    const score_presupuesto =
      p.presupuesto != null && prop.precio != null
        ? p.presupuesto >= prop.precio
        : p.presupuesto == null;
    const ptsPresupuesto = p.presupuesto != null ? 40 : 20;

    // Zona (30 pts) — solo si el pedido tiene zona_deseada FK
    const zonaDeseadaId = (p.zona as { id: number } | null)?.id ?? p.zona_deseada;
    const score_zona =
      zonaDeseadaId != null && propZonaId != null
        ? zonaDeseadaId === propZonaId
        : false;

    // Modalidad compatible con tipo_operacion (20 pts)
    const score_modalidad = isModalidadCompatible(p.modalidad, prop.tipo_operacion);

    const score =
      (score_presupuesto ? ptsPresupuesto : 0) +
      (score_zona ? 30 : 0) +
      (score_modalidad ? 20 : 0);

    // Descartar si no cumple presupuesto mínimo (y tiene presupuesto definido)
    if (p.presupuesto != null && prop.precio != null && p.presupuesto < prop.precio) continue;

    results.push({
      id: p.id,
      nombre_cliente: p.nombre_cliente,
      telefono: p.telefono,
      presupuesto: p.presupuesto,
      zona_busqueda: p.zona_busqueda,
      zona_nombre: (p.zona as { nombre: string | null } | null)?.nombre ?? null,
      zona_id: zonaDeseadaId ?? null,
      tipo_propiedad: p.tipo_propiedad,
      modalidad: p.modalidad,
      habitaciones: p.habitaciones,
      garaje: p.garaje,
      score,
      score_presupuesto,
      score_zona,
      score_modalidad,
    });
  }

  results.sort((a, b) => b.score - a.score);

  return results;
}

export type PropiedadInfo = {
  precio: number | null;
  tipo_operacion: string | null;
  zona_nombre: string | null;
  titulo: string | null;
  propietario: string | null;
};

export async function getPropiedadForMatchingAction(
  propiedadId: number
): Promise<PropiedadInfo | null> {
  const yo = await getCurrentUserContext();
  if (!yo?.empresaId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("propiedades")
    .select("precio, tipo_operacion, titulo, propietario, fincas(sectores(zona(nombre)))")
    .eq("id", propiedadId)
    .eq("empresa_id", yo.empresaId)
    .maybeSingle();

  if (!data) return null;

  type D = typeof data & {
    fincas: { sectores: { zona: { nombre: string } | null } | null } | null;
  };
  const d = data as unknown as D;

  return {
    precio: d.precio,
    tipo_operacion: d.tipo_operacion,
    zona_nombre: d.fincas?.sectores?.zona?.nombre ?? null,
    titulo: d.titulo,
    propietario: d.propietario,
  };
}

// ─── Fase 3: solicitud → propiedades compatibles ──────────────────────────────

export async function findCompatiblePropertiesAction(
  pedidoId: number
): Promise<PropertyMatch[]> {
  const yo = await getCurrentUserContext();
  if (!yo?.empresaId) return [];

  const supabase = await createClient();

  // Cargar datos del pedido
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("presupuesto, modalidad, tipo_propiedad, zona_deseada, empresa_id")
    .eq("id", pedidoId)
    .maybeSingle();

  if (!pedido || pedido.empresa_id !== yo.empresaId) return [];

  // Obtener propiedades activas de la misma empresa (excluir vendidas)
  const { data: propiedades } = await supabase
    .from("propiedades")
    .select(
      "id, titulo, propietario, precio, estado, tipo_operacion, finca_id, fincas(sectores(id, zona(id, nombre)))"
    )
    .eq("empresa_id", yo.empresaId)
    .neq("estado", "vendido")
    .not("precio", "is", null)
    .order("precio", { ascending: true });

  type PropRow = {
    id: number;
    titulo: string | null;
    propietario: string | null;
    precio: number | null;
    estado: string | null;
    tipo_operacion: string | null;
    finca_id: number | null;
    fincas: {
      sectores: {
        id: number;
        zona: { id: number; nombre: string } | null;
      } | null;
    } | null;
  };

  const results: PropertyMatch[] = [];

  for (const prop of (propiedades ?? []) as unknown as PropRow[]) {
    // Filtrar por presupuesto
    if (pedido.presupuesto != null && prop.precio != null && prop.precio > pedido.presupuesto)
      continue;

    const zonaId = prop.fincas?.sectores?.zona?.id ?? null;
    const zonaNombre = prop.fincas?.sectores?.zona?.nombre ?? null;
    const sectorId = prop.fincas?.sectores?.id ?? null;

    const score_presupuesto =
      pedido.presupuesto != null && prop.precio != null
        ? prop.precio <= pedido.presupuesto
        : true;
    const ptsPresupuesto = pedido.presupuesto != null ? 40 : 20;

    const score_zona =
      pedido.zona_deseada != null && zonaId != null
        ? pedido.zona_deseada === zonaId
        : false;

    const score_modalidad = isModalidadCompatible(pedido.modalidad, prop.tipo_operacion);

    const score =
      (score_presupuesto ? ptsPresupuesto : 0) +
      (score_zona ? 30 : 0) +
      (score_modalidad ? 20 : 0);

    results.push({
      id: prop.id,
      titulo: prop.titulo,
      propietario: prop.propietario,
      precio: prop.precio,
      estado: prop.estado,
      tipo_operacion: prop.tipo_operacion,
      zona_nombre: zonaNombre,
      zona_id: zonaId,
      finca_id: prop.finca_id,
      sector_id: sectorId,
      score,
      score_presupuesto,
      score_zona,
      score_modalidad,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export { formatModalidadPedido };
