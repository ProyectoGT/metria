import { createClient } from "@/lib/supabase";
import type { CurrentUserContext } from "@/lib/current-user";

// ─── Tipos de salida ────────────────────────────────────────────────────────

export type ZonaPedidosRow = {
  zona_id: number;
  zona_nombre: string;
  pedidos_activos: number;
};

export type ZonaEncargosRow = {
  zona_id: number;
  zona_nombre: string;
  encargos: number;
};

export type PropiedadSinActividad = {
  id: number;
  label: string;
  estado: string;
  dias_inactiva: number;
  agente_nombre: string | null;
};

export type AgenteConversionRow = {
  agente_id: number;
  agente_nombre: string;
  encargos: number;
  ventas: number;
  tasa_conversion: number | null; // ventas / encargos, null si encargos === 0
};

export type AgentePedidosSinSeguimiento = {
  agente_id: number;
  agente_nombre: string;
  pedidos_sin_seguimiento: number;
};

export type EvolucionMensualRow = {
  mes: number;           // 1-12
  mes_label: string;
  contactos: number;
  pedidos: number;
  encargos: number;
  ventas: number;
};

export type InsightsData = {
  zonasPedidos: ZonaPedidosRow[];
  zonasEncargos: ZonaEncargosRow[];
  propiedadesSinActividad: PropiedadSinActividad[];
  agentesConversion: AgenteConversionRow[];
  agentesPedidosSinSeguimiento: AgentePedidosSinSeguimiento[];
  evolucionMensual: EvolucionMensualRow[];
  // Filtros devueltos para uso del cliente
  agentes: { id: number; nombre: string }[];
  zonas: { id: number; nombre: string }[];
  anio: number;
};

// ─── Parámetros de filtro ────────────────────────────────────────────────────

export type InsightsFilters = {
  anio: number;
  agenteId?: number | null;
  zonaId?: number | null;
};

// ─── Constantes ─────────────────────────────────────────────────────────────

const MESES_LABEL = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const PROPIEDAD_INACTIVA_DIAS = 14;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toTime(v: string | null | undefined) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function fetchInsights(
  user: CurrentUserContext,
  filters: InsightsFilters,
): Promise<InsightsData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;

  const { anio, agenteId, zonaId } = filters;
  const empresaId = user.empresaId;
  const isManager = user.role === "Administrador" || user.role === "Director" || user.role === "Responsable";

  // Agentes visibles según rol
  const allowedAgentIds: number[] | null =
    user.role === "Administrador" || user.role === "Director"
      ? null
      : user.role === "Responsable"
        ? [user.id, ...user.supervisedAgentIds]
        : [user.id];

  // Si hay filtro de agente adicional, intersectar
  const effectiveAgentIds: number[] | null = agenteId
    ? allowedAgentIds
      ? allowedAgentIds.includes(agenteId) ? [agenteId] : [-1]
      : [agenteId]
    : allowedAgentIds;

  // ── Carga paralela inicial ──────────────────────────────────────────────

  const [
    { data: agentesData },
    { data: zonasData },
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nombre, apellidos, rol")
      .not("rol", "ilike", "administrador")
      .order("nombre"),
    supabase.from("zona").select("id, nombre").order("nombre"),
  ]);

  type AgenteRow = { id: number; nombre: string; apellidos: string; rol: string };
  type ZonaRow = { id: number; nombre: string };

  let agentes = (agentesData ?? []) as AgenteRow[];
  if (!isManager) agentes = agentes.filter((a) => a.id === user.id);
  else if (allowedAgentIds) agentes = agentes.filter((a) => allowedAgentIds.includes(a.id));

  const agentList = agentes.map((a) => ({ id: a.id, nombre: `${a.nombre} ${a.apellidos}`.trim() }));
  const agenteMap = new Map(agentList.map((a) => [a.id, a.nombre]));
  const zonas = (zonasData ?? []) as ZonaRow[];
  const zonaMap = new Map(zonas.map((z) => [z.id, z.nombre]));

  // Resolver finca IDs para filtro de zona
  let zonaFincaIds: number[] | null = null;
  if (zonaId) {
    const { data: sectoresData } = await supabase
      .from("sectores")
      .select("fincas(id)")
      .eq("zona_id", zonaId);
    type SW = { fincas: { id: number }[] | null };
    zonaFincaIds = ((sectoresData ?? []) as unknown as SW[]).flatMap(
      (s) => (Array.isArray(s.fincas) ? s.fincas.map((f: { id: number }) => f.id) : [])
    );
  }

  // ── Propiedades y pedidos ───────────────────────────────────────────────

  let propQ = supabase
    .from("propiedades")
    .select("id, propietario, planta, puerta, estado, honorarios, agente_asignado, finca_id, created_at")
    .not("estado", "ilike", "vendid%");
  if (effectiveAgentIds) propQ = propQ.in("agente_asignado", effectiveAgentIds.length ? effectiveAgentIds : [-1]);
  if (zonaFincaIds) propQ = propQ.in("finca_id", zonaFincaIds.length ? zonaFincaIds : [-1]);

  let pedidosQ = supabase
    .from("pedidos")
    .select("id, nombre_cliente, owner_user_id, zona_deseada, created_at");
  if (effectiveAgentIds) pedidosQ = pedidosQ.in("owner_user_id", effectiveAgentIds.length ? effectiveAgentIds : [-1]);

  // Rendimiento anual para conversión y evolución
  const rendQ = supabase
    .from("rendimiento")
    .select("agente_id, mes, encargos, ventas, contactos")
    .eq("anio", anio)
    .gte("mes", 1)
    .lte("mes", 12);

  // Actividad de desarrollo (encargos/ventas reales registrados)
  const actividadFrom = new Date(Date.UTC(anio, 0, 1)).toISOString();
  const actividadTo = new Date(Date.UTC(anio + 1, 0, 1)).toISOString();
  const actividadQ = supabase
    .from("actividad_desarrollo")
    .select("agente_id, metric, value, occurred_at")
    .gte("occurred_at", actividadFrom)
    .lt("occurred_at", actividadTo)
    .in("metric", ["encargos", "ventas", "contactos", "pedidos"]);

  const [
    { data: propiedadesData },
    { data: pedidosData },
    { data: rendimientoData },
    { data: actividadData },
  ] = await Promise.all([propQ, pedidosQ, rendQ, actividadQ]);

  type PropRow = { id: number; propietario: string | null; planta: string | null; puerta: string | null; estado: string | null; agente_asignado: number | null; finca_id: number | null; created_at: string | null };
  type PedidoRow = { id: number; nombre_cliente: string; owner_user_id: number | null; zona_deseada: number | null; created_at: string | null };
  type RendRow = { agente_id: number; mes: number; encargos: number | null; ventas: number | null; contactos: number | null };
  type ActRow = { agente_id: number | null; metric: string | null; value: number | null; occurred_at: string };

  const propiedades = (propiedadesData ?? []) as PropRow[];
  const pedidos = (pedidosData ?? []) as PedidoRow[];
  const rendimiento = (rendimientoData ?? []) as RendRow[];
  const actividad = (actividadData ?? []) as ActRow[];

  // ── Timeline: última actividad por propiedad y pedido ──────────────────

  const propIds = propiedades.map((p) => p.id);
  const pedidoIds = pedidos.map((p) => p.id);

  const [{ data: propTimeline }, { data: pedidoTimeline }] = await Promise.all([
    propIds.length
      ? supabase.from("contacto_timeline_events").select("propiedad_id, created_at").in("propiedad_id", propIds)
      : Promise.resolve({ data: [] }),
    pedidoIds.length
      ? supabase.from("contacto_timeline_events").select("pedido_id, created_at").in("pedido_id", pedidoIds)
      : Promise.resolve({ data: [] }),
  ]);

  const lastPropActivity = new Map<number, number>();
  for (const e of (propTimeline ?? []) as Array<{ propiedad_id: number | null; created_at: string }>) {
    if (e.propiedad_id) lastPropActivity.set(e.propiedad_id, Math.max(lastPropActivity.get(e.propiedad_id) ?? 0, toTime(e.created_at)));
  }

  const lastPedidoActivity = new Map<number, number>();
  for (const e of (pedidoTimeline ?? []) as Array<{ pedido_id: number | null; created_at: string }>) {
    if (e.pedido_id) lastPedidoActivity.set(e.pedido_id, Math.max(lastPedidoActivity.get(e.pedido_id) ?? 0, toTime(e.created_at)));
  }

  // ── 1. Zonas con más pedidos activos ────────────────────────────────────

  const pedidosPorZona = new Map<number, number>();
  for (const p of pedidos) {
    if (!p.zona_deseada) continue;
    pedidosPorZona.set(p.zona_deseada, (pedidosPorZona.get(p.zona_deseada) ?? 0) + 1);
  }
  const zonasPedidos: ZonaPedidosRow[] = [...pedidosPorZona.entries()]
    .map(([zona_id, pedidos_activos]) => ({
      zona_id,
      zona_nombre: zonaMap.get(zona_id) ?? `Zona #${zona_id}`,
      pedidos_activos,
    }))
    .sort((a, b) => b.pedidos_activos - a.pedidos_activos)
    .slice(0, 10);

  // ── 2. Zonas con más propiedades en encargo ──────────────────────────────

  // Necesitamos finca→zona. Cargamos solo si hay propiedades en encargo
  const encargosProps = propiedades.filter((p) => p.estado?.toLowerCase().startsWith("encarg"));
  let zonasEncargos: ZonaEncargosRow[] = [];

  if (encargosProps.length > 0) {
    const fincaIds = [...new Set(encargosProps.map((p) => p.finca_id).filter(Boolean))] as number[];
    const { data: fincasData } = await supabase
      .from("fincas")
      .select("id, sector_id, sectores(zona_id)")
      .in("id", fincaIds);

    type FincaRow = { id: number; sector_id: number | null; sectores: { zona_id: number | null } | null };
    const fincaZonaMap = new Map<number, number>();
    for (const f of (fincasData ?? []) as FincaRow[]) {
      const zId = f.sectores?.zona_id;
      if (zId) fincaZonaMap.set(f.id, zId);
    }

    const encargosCount = new Map<number, number>();
    for (const p of encargosProps) {
      if (!p.finca_id) continue;
      const zId = fincaZonaMap.get(p.finca_id);
      if (!zId) continue;
      encargosCount.set(zId, (encargosCount.get(zId) ?? 0) + 1);
    }

    zonasEncargos = [...encargosCount.entries()]
      .map(([zona_id, encargos]) => ({
        zona_id,
        zona_nombre: zonaMap.get(zona_id) ?? `Zona #${zona_id}`,
        encargos,
      }))
      .sort((a, b) => b.encargos - a.encargos)
      .slice(0, 10);
  }

  // ── 3. Propiedades sin actividad ─────────────────────────────────────────

  const propiedadesSinActividad: PropiedadSinActividad[] = propiedades
    .map((p) => {
      const last = Math.max(lastPropActivity.get(p.id) ?? 0, toTime(p.created_at));
      const dias = last ? Math.floor((Date.now() - last) / 86_400_000) : PROPIEDAD_INACTIVA_DIAS;
      const label = p.propietario?.trim()
        || [p.planta && `Planta ${p.planta}`, p.puerta && `Puerta ${p.puerta}`].filter(Boolean).join(" ")
        || `Propiedad #${p.id}`;
      return {
        id: p.id,
        label,
        estado: p.estado ?? "—",
        dias_inactiva: dias,
        agente_nombre: p.agente_asignado ? (agenteMap.get(p.agente_asignado) ?? null) : null,
      };
    })
    .filter((p) => p.dias_inactiva >= PROPIEDAD_INACTIVA_DIAS)
    .sort((a, b) => b.dias_inactiva - a.dias_inactiva)
    .slice(0, 20);

  // ── 4. Conversión tarea→encargo/venta por agente ─────────────────────────
  // Usamos rendimiento (encargos + ventas acumulados) como proxy de conversión

  const agenteEncargos = new Map<number, number>();
  const agenteVentas = new Map<number, number>();
  const agenteContactos = new Map<number, number>();

  // Sumamos por actividad real (actividad_desarrollo) — más fiable que rendimiento
  for (const act of actividad) {
    if (!act.agente_id) continue;
    const val = Number(act.value ?? 0);
    if (act.metric === "encargos") agenteEncargos.set(act.agente_id, (agenteEncargos.get(act.agente_id) ?? 0) + val);
    if (act.metric === "ventas") agenteVentas.set(act.agente_id, (agenteVentas.get(act.agente_id) ?? 0) + val);
    if (act.metric === "contactos") agenteContactos.set(act.agente_id, (agenteContactos.get(act.agente_id) ?? 0) + val);
  }

  // Fallback a rendimiento si actividad vacía
  if (agenteEncargos.size === 0) {
    for (const r of rendimiento) {
      agenteEncargos.set(r.agente_id, (agenteEncargos.get(r.agente_id) ?? 0) + Number(r.encargos ?? 0));
      agenteVentas.set(r.agente_id, (agenteVentas.get(r.agente_id) ?? 0) + Number(r.ventas ?? 0));
      agenteContactos.set(r.agente_id, (agenteContactos.get(r.agente_id) ?? 0) + Number(r.contactos ?? 0));
    }
  }

  const agentesConversion: AgenteConversionRow[] = agentList
    .map((a) => {
      const enc = agenteEncargos.get(a.id) ?? 0;
      const ven = agenteVentas.get(a.id) ?? 0;
      return {
        agente_id: a.id,
        agente_nombre: a.nombre,
        encargos: enc,
        ventas: ven,
        tasa_conversion: enc > 0 ? Math.round((ven / enc) * 100) : null,
      };
    })
    .sort((a, b) => (b.tasa_conversion ?? -1) - (a.tasa_conversion ?? -1));

  // ── 5. Pedidos sin seguimiento por agente ────────────────────────────────

  const pedidosSinSeguimiento = new Map<number, number>();
  for (const pedido of pedidos) {
    const ownerId = pedido.owner_user_id;
    if (!ownerId) continue;
    const last = lastPedidoActivity.get(pedido.id) ?? toTime(pedido.created_at);
    const days = last ? Math.floor((Date.now() - last) / 86_400_000) : 14;
    if (days >= 14) {
      pedidosSinSeguimiento.set(ownerId, (pedidosSinSeguimiento.get(ownerId) ?? 0) + 1);
    }
  }

  const agentesPedidosSinSeguimiento: AgentePedidosSinSeguimiento[] = agentList
    .map((a) => ({
      agente_id: a.id,
      agente_nombre: a.nombre,
      pedidos_sin_seguimiento: pedidosSinSeguimiento.get(a.id) ?? 0,
    }))
    .filter((a) => a.pedidos_sin_seguimiento > 0)
    .sort((a, b) => b.pedidos_sin_seguimiento - a.pedidos_sin_seguimiento);

  // ── 6. Evolución mensual ─────────────────────────────────────────────────

  // Pedidos creados por mes en el año
  const pedidosPorMes = new Array(12).fill(0);
  for (const p of pedidos) {
    const d = new Date(p.created_at ?? "");
    if (d.getFullYear() === anio) pedidosPorMes[d.getMonth()] += 1;
  }

  // Encargos y ventas y contactos por mes desde actividad_desarrollo
  const encargosM = new Array(12).fill(0);
  const ventasM = new Array(12).fill(0);
  const contactosM = new Array(12).fill(0);

  for (const act of actividad) {
    const d = new Date(act.occurred_at);
    if (d.getFullYear() !== anio) continue;
    const m = d.getMonth();
    const val = Number(act.value ?? 0);
    if (act.metric === "encargos") encargosM[m] += val;
    if (act.metric === "ventas") ventasM[m] += val;
    if (act.metric === "contactos") contactosM[m] += val;
  }

  // Fallback: si actividad vacía, usar rendimiento
  if (actividad.length === 0) {
    for (const r of rendimiento) {
      const m = r.mes - 1;
      if (m < 0 || m > 11) continue;
      encargosM[m] += Number(r.encargos ?? 0);
      ventasM[m] += Number(r.ventas ?? 0);
      contactosM[m] += Number(r.contactos ?? 0);
    }
  }

  const evolucionMensual: EvolucionMensualRow[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    mes_label: MESES_LABEL[i],
    contactos: contactosM[i],
    pedidos: pedidosPorMes[i],
    encargos: encargosM[i],
    ventas: ventasM[i],
  }));

  void empresaId;

  return {
    zonasPedidos,
    zonasEncargos,
    propiedadesSinActividad,
    agentesConversion,
    agentesPedidosSinSeguimiento,
    evolucionMensual,
    agentes: agentList,
    zonas: zonas.map((z) => ({ id: z.id, nombre: z.nombre })),
    anio,
  };
}
