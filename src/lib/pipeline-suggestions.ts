import { createClient } from "@/lib/supabase";
import type { CurrentUserContext } from "@/lib/current-user";

export type PipelineSuggestionStatus = "pendiente" | "aceptada" | "rechazada" | "expirada";

export type PipelineSuggestionRule =
  | "pedido_frio"
  | "visita_agendada"
  | "propiedad_sin_actividad"
  | "encargo_firmado"
  | "oportunidad_activa";

export type PipelineSuggestion = {
  id: number;
  propiedad_id: number | null;
  pedido_id: number | null;
  agente_id: number | null;
  estado_actual: string;
  estado_sugerido: string;
  tipo_regla: PipelineSuggestionRule;
  razon: string;
  dias_sin_actividad: number | null;
  status: PipelineSuggestionStatus;
  created_at: string;
  // Joined labels for display
  label?: string;
  agente_nombre?: string;
};

// Días sin contacto para considerar un pedido "frío"
const PEDIDO_FRIO_DIAS = 14;
// Días sin actividad para sugerir revisión de propiedad
const PROPIEDAD_INACTIVA_DIAS = 10;

function allowedAgentIds(user: CurrentUserContext): number[] | null {
  if (user.role === "Administrador" || user.role === "Director") return null;
  if (user.role === "Responsable") return [user.id, ...user.supervisedAgentIds];
  return [user.id];
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function toTime(v: string | null | undefined) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Genera sugerencias de cambio de estado y las inserta en pipeline_state_suggestions
 * si no existen ya en estado "pendiente" para el mismo sujeto + regla.
 * Devuelve las sugerencias pendientes visibles para el usuario.
 */
export async function generateAndFetchSuggestions(
  user: CurrentUserContext
): Promise<PipelineSuggestion[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const allowedIds = allowedAgentIds(user);
  const now = new Date();

  // ── 1. Cargar datos necesarios ──────────────────────────────────────────────

  let pedidosQ = supabase
    .from("pedidos")
    .select("id, nombre_cliente, owner_user_id, created_at")
    .order("id", { ascending: false })
    .limit(100);
  if (allowedIds) pedidosQ = pedidosQ.in("owner_user_id", allowedIds.length ? allowedIds : [-1]);

  let propiedadesQ = supabase
    .from("propiedades")
    .select("id, propietario, planta, puerta, estado, agente_asignado, contactado_hasta, fecha_visita, created_at")
    .not("estado", "ilike", "vendid%")
    .order("id", { ascending: false })
    .limit(150);
  if (allowedIds) propiedadesQ = propiedadesQ.in("agente_asignado", allowedIds.length ? allowedIds : [-1]);

  const [{ data: pedidosData }, { data: propiedadesData }] = await Promise.all([
    pedidosQ,
    propiedadesQ,
  ]);

  type PedidoRow = { id: number; nombre_cliente: string; owner_user_id: number; created_at: string | null };
  type PropRow = {
    id: number;
    propietario: string | null;
    planta: string | null;
    puerta: string | null;
    estado: string;
    agente_asignado: number | null;
    contactado_hasta: string | null;
    fecha_visita: string | null;
    created_at: string | null;
  };

  const pedidos = (pedidosData ?? []) as PedidoRow[];
  const propiedades = (propiedadesData ?? []) as PropRow[];

  // ── 2. Actividad reciente en timeline ───────────────────────────────────────
  const pedidoIds = pedidos.map((p) => p.id);
  const propIds = propiedades.map((p) => p.id);

  const [{ data: pedidoTimeline }, { data: propTimeline }] = await Promise.all([
    pedidoIds.length
      ? supabase.from("contacto_timeline_events").select("pedido_id,created_at").in("pedido_id", pedidoIds)
      : Promise.resolve({ data: [] }),
    propIds.length
      ? supabase.from("contacto_timeline_events").select("propiedad_id,created_at").in("propiedad_id", propIds)
      : Promise.resolve({ data: [] }),
  ]);

  const lastPedidoActivity = new Map<number, number>();
  for (const e of (pedidoTimeline ?? []) as Array<{ pedido_id: number | null; created_at: string }>) {
    if (e.pedido_id) lastPedidoActivity.set(e.pedido_id, Math.max(lastPedidoActivity.get(e.pedido_id) ?? 0, toTime(e.created_at)));
  }

  const lastPropActivity = new Map<number, number>();
  for (const e of (propTimeline ?? []) as Array<{ propiedad_id: number | null; created_at: string }>) {
    if (e.propiedad_id) lastPropActivity.set(e.propiedad_id, Math.max(lastPropActivity.get(e.propiedad_id) ?? 0, toTime(e.created_at)));
  }

  // ── 3. Sugerencias ya pendientes (para evitar duplicados) ───────────────────
  const { data: existingData } = await supabase
    .from("pipeline_state_suggestions")
    .select("propiedad_id,pedido_id,tipo_regla")
    .eq("status", "pendiente")
    .eq("empresa_id", user.empresaId ?? -1);

  type ExistingKey = { propiedad_id: number | null; pedido_id: number | null; tipo_regla: string };
  const existingSet = new Set<string>(
    ((existingData ?? []) as ExistingKey[]).map(
      (r) => `${r.propiedad_id ?? "null"}-${r.pedido_id ?? "null"}-${r.tipo_regla}`
    )
  );

  function alreadyExists(propId: number | null, pedId: number | null, rule: string) {
    return existingSet.has(`${propId ?? "null"}-${pedId ?? "null"}-${rule}`);
  }

  // ── 4. Generar nuevas sugerencias ───────────────────────────────────────────
  type InsertRow = {
    empresa_id: number | null;
    propiedad_id: number | null;
    pedido_id: number | null;
    agente_id: number | null;
    estado_actual: string;
    estado_sugerido: string;
    tipo_regla: string;
    razon: string;
    dias_sin_actividad: number | null;
    status: string;
  };

  const toInsert: InsertRow[] = [];

  // Regla: pedido_frio — pedido sin contacto X días → frío
  for (const pedido of pedidos) {
    if (alreadyExists(null, pedido.id, "pedido_frio")) continue;
    const last = lastPedidoActivity.get(pedido.id) ?? toTime(pedido.created_at);
    const days = last ? Math.floor((now.getTime() - last) / 86400000) : PEDIDO_FRIO_DIAS;
    if (days >= PEDIDO_FRIO_DIAS) {
      toInsert.push({
        empresa_id: user.empresaId,
        propiedad_id: null,
        pedido_id: pedido.id,
        agente_id: pedido.owner_user_id,
        estado_actual: "activo",
        estado_sugerido: "frio",
        tipo_regla: "pedido_frio",
        razon: `${days} dias sin actividad registrada en timeline.`,
        dias_sin_actividad: days,
        status: "pendiente",
      });
    }
  }

  // Regla: visita_agendada — propiedad con fecha_visita futura → caliente
  for (const prop of propiedades) {
    if (prop.estado === "encargo" || prop.estado === "vendido") continue;
    if (!prop.fecha_visita) continue;
    if (alreadyExists(prop.id, null, "visita_agendada")) continue;
    const visitDate = new Date(prop.fecha_visita);
    if (visitDate >= now) {
      toInsert.push({
        empresa_id: user.empresaId,
        propiedad_id: prop.id,
        pedido_id: null,
        agente_id: prop.agente_asignado,
        estado_actual: prop.estado,
        estado_sugerido: "seguimiento",
        tipo_regla: "visita_agendada",
        razon: `Visita programada para ${prop.fecha_visita}. Se recomienda pasar a seguimiento.`,
        dias_sin_actividad: null,
        status: "pendiente",
      });
    }
  }

  // Regla: propiedad_sin_actividad — sin actividad X días → requiere seguimiento
  for (const prop of propiedades) {
    if (prop.estado === "encargo" || prop.estado === "vendido") continue;
    if (alreadyExists(prop.id, null, "propiedad_sin_actividad")) continue;
    const last = Math.max(lastPropActivity.get(prop.id) ?? 0, toTime(prop.created_at));
    const days = last ? Math.floor((now.getTime() - last) / 86400000) : PROPIEDAD_INACTIVA_DIAS;
    if (days >= PROPIEDAD_INACTIVA_DIAS && prop.estado !== "seguimiento") {
      toInsert.push({
        empresa_id: user.empresaId,
        propiedad_id: prop.id,
        pedido_id: null,
        agente_id: prop.agente_asignado,
        estado_actual: prop.estado,
        estado_sugerido: "seguimiento",
        tipo_regla: "propiedad_sin_actividad",
        razon: `${days} dias sin actividad. Puede requerir contacto con el propietario.`,
        dias_sin_actividad: days,
        status: "pendiente",
      });
    }
  }

  // ── 5. Insertar nuevas sugerencias ──────────────────────────────────────────
  if (toInsert.length > 0) {
    await supabase.from("pipeline_state_suggestions").insert(toInsert);
  }

  // ── 6. Devolver sugerencias pendientes visibles ─────────────────────────────
  let fetchQ = supabase
    .from("pipeline_state_suggestions")
    .select(`
      id, propiedad_id, pedido_id, agente_id, estado_actual, estado_sugerido,
      tipo_regla, razon, dias_sin_actividad, status, created_at,
      propiedades(propietario, planta, puerta),
      pedidos(nombre_cliente),
      usuarios:usuarios!pipeline_state_suggestions_agente_id_fkey(nombre, apellidos)
    `)
    .eq("status", "pendiente")
    .order("created_at", { ascending: false })
    .limit(30);

  if (user.empresaId) fetchQ = fetchQ.eq("empresa_id", user.empresaId);
  if (allowedIds) fetchQ = fetchQ.in("agente_id", allowedIds.length ? allowedIds : [-1]);

  const { data: rows } = await fetchQ;

  type Row = {
    id: number;
    propiedad_id: number | null;
    pedido_id: number | null;
    agente_id: number | null;
    estado_actual: string;
    estado_sugerido: string;
    tipo_regla: string;
    razon: string;
    dias_sin_actividad: number | null;
    status: string;
    created_at: string;
    propiedades: { propietario: string | null; planta: string | null; puerta: string | null } | null;
    pedidos: { nombre_cliente: string } | null;
    usuarios: { nombre: string | null; apellidos: string | null } | null;
  };

  return ((rows ?? []) as Row[]).map((r) => {
    let label = "";
    if (r.pedidos?.nombre_cliente) {
      label = r.pedidos.nombre_cliente;
    } else if (r.propiedades) {
      const p = r.propiedades;
      label = p.propietario?.trim() || [p.planta && `Planta ${p.planta}`, p.puerta && `Puerta ${p.puerta}`].filter(Boolean).join(" ") || `Propiedad #${r.propiedad_id}`;
    }
    const agente_nombre = r.usuarios
      ? `${r.usuarios.nombre ?? ""} ${r.usuarios.apellidos ?? ""}`.trim()
      : undefined;

    return {
      id: r.id,
      propiedad_id: r.propiedad_id,
      pedido_id: r.pedido_id,
      agente_id: r.agente_id,
      estado_actual: r.estado_actual,
      estado_sugerido: r.estado_sugerido,
      tipo_regla: r.tipo_regla as PipelineSuggestionRule,
      razon: r.razon,
      dias_sin_actividad: r.dias_sin_actividad,
      status: r.status as PipelineSuggestionStatus,
      created_at: r.created_at,
      label,
      agente_nombre,
    };
  });
}
