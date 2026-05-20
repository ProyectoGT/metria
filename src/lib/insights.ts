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

export type PropiedadPorEstado = {
  estado: string;
  total: number;
};

export type AgenteConversionRow = {
  agente_id: number;
  agente_nombre: string;
  encargos: number;
  ventas: number;
  tasa_conversion: number | null;
};

export type AgenteRankingRow = {
  agente_id: number;
  agente_nombre: string;
  valor: number;
};

export type AgentePedidosSinSeguimiento = {
  agente_id: number;
  agente_nombre: string;
  pedidos_sin_seguimiento: number;
};

export type AgenteSinResponsable = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export type UsuarioInactivoConPendientes = {
  id: number;
  nombre: string;
  correo: string;
  tareas_abiertas: number;
  pedidos_abiertos: number;
};

export type EvolucionMensualRow = {
  mes: number;
  mes_label: string;
  contactos: number;
  pedidos: number;
  encargos: number;
  ventas: number;
};

export type InsightsData = {
  // Resumen rápido
  propiedadesPorEstado: PropiedadPorEstado[];
  totalPedidosActivos: number;

  // Zonas
  zonasPedidos: ZonaPedidosRow[];
  zonasEncargos: ZonaEncargosRow[];

  // Actividad
  propiedadesSinActividad: PropiedadSinActividad[];
  agentesConversion: AgenteConversionRow[];
  agentesPedidosSinSeguimiento: AgentePedidosSinSeguimiento[];

  // Rankings
  rankingPropiedadesGestionadas: AgenteRankingRow[];
  rankingTareasCompletadas: AgenteRankingRow[];

  // Alertas
  agenteSinResponsable: AgenteSinResponsable[];
  usuariosInactivosConPendientes: UsuarioInactivoConPendientes[];

  // Evolución
  evolucionMensual: EvolucionMensualRow[];

  // Filtros disponibles
  agentes: { id: number; nombre: string }[];
  zonas: { id: number; nombre: string }[];
  anio: number;
};

// ─── Parámetros de filtro ────────────────────────────────────────────────────

export type InsightsFilters = {
  anio: number;
  agenteId?: number | null;
  zonaId?: number | null;
  fechaDesde?: string | null; // ISO date YYYY-MM-DD
  fechaHasta?: string | null;
};

// ─── Constantes ─────────────────────────────────────────────────────────────

const MESES_LABEL = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const PROPIEDAD_INACTIVA_DIAS = 14;
const PEDIDO_SIN_SEGUIMIENTO_DIAS = 14;

const ESTADOS_ORDEN = ["noticia", "investigacion", "seguimiento", "encargo", "vendido", "neutral"];

// ─── Helpers internos ────────────────────────────────────────────────────────

function toTime(v: string | null | undefined) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function fetchInsights(
  user: CurrentUserContext,
  filters: InsightsFilters,
): Promise<InsightsData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;

  const { anio, agenteId, zonaId, fechaDesde, fechaHasta } = filters;

  // ── Scope de agentes según rol ──────────────────────────────────────────
  // Administrador/Director: todos los agentes de la empresa.
  // Responsable: solo sus supervisados (+ él mismo para sus propias métricas).
  // Agente: no debería llegar aquí (guard en page.tsx), pero lo dejamos safe.
  const allowedAgentIds: number[] | null =
    user.role === "Administrador" || user.role === "Director"
      ? null
      : user.role === "Responsable"
        ? [user.id, ...user.supervisedAgentIds]
        : [user.id];

  // Si hay filtro de agente adicional, intersectar con los permitidos
  const effectiveAgentIds: number[] | null = agenteId
    ? allowedAgentIds
      ? allowedAgentIds.includes(agenteId) ? [agenteId] : [-1]
      : [agenteId]
    : allowedAgentIds;

  // Rango de fechas para consultas de actividad
  const actividadFrom = fechaDesde
    ? new Date(fechaDesde).toISOString()
    : new Date(Date.UTC(anio, 0, 1)).toISOString();
  const actividadTo = fechaHasta
    ? new Date(new Date(fechaHasta).getTime() + 86_400_000).toISOString()
    : new Date(Date.UTC(anio + 1, 0, 1)).toISOString();

  // ── Carga inicial paralela ──────────────────────────────────────────────
  // SEGURIDAD: todas las queries de usuarios filtran por empresa_id explícitamente
  // para no depender solo de RLS como única capa.

  const [
    { data: agentesData },
    { data: zonasData },
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nombre, apellidos, rol, estado, supervisor_id")
      .eq("empresa_id", user.empresaId ?? -1)          // filtro empresa explícito
      .not("rol", "ilike", "administrador")
      .order("nombre"),
    supabase.from("zona").select("id, nombre").order("nombre"),
  ]);

  type AgenteRow = {
    id: number; nombre: string; apellidos: string; rol: string;
    estado: string | null; supervisor_id: number | null;
  };
  type ZonaRow = { id: number; nombre: string };

  let agentes = (agentesData ?? []) as AgenteRow[];
  // Filtrar agentes visibles según rol
  if (allowedAgentIds) agentes = agentes.filter((a) => allowedAgentIds.includes(a.id));

  const agentList = agentes.map((a) => ({
    id: a.id,
    nombre: `${a.nombre} ${a.apellidos}`.trim(),
  }));
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

  // ── Queries de datos principales ────────────────────────────────────────

  let propQ = supabase
    .from("propiedades")
    .select("id, propietario, planta, puerta, estado, honorarios, agente_asignado, finca_id, created_at")
    .eq("empresa_id", user.empresaId ?? -1);             // filtro empresa explícito
  if (effectiveAgentIds) propQ = propQ.in("agente_asignado", effectiveAgentIds.length ? effectiveAgentIds : [-1]);
  if (zonaFincaIds) propQ = propQ.in("finca_id", zonaFincaIds.length ? zonaFincaIds : [-1]);

  let pedidosQ = supabase
    .from("pedidos")
    .select("id, nombre_cliente, owner_user_id, zona_deseada, created_at")
    .eq("empresa_id", user.empresaId ?? -1);             // filtro empresa explícito
  if (effectiveAgentIds) pedidosQ = pedidosQ.in("owner_user_id", effectiveAgentIds.length ? effectiveAgentIds : [-1]);

  let tareasQ = supabase
    .from("tareas")
    .select("id, estado, owner_user_id")
    .eq("empresa_id", user.empresaId ?? -1)
    .is("archived_at", null);
  if (effectiveAgentIds) tareasQ = tareasQ.in("owner_user_id", effectiveAgentIds.length ? effectiveAgentIds : [-1]);

  const tareasCompletadasQ = supabase
    .from("tareas")
    .select("owner_user_id")
    .eq("empresa_id", user.empresaId ?? -1)
    .eq("estado", "completado")
    .is("archived_at", null)
    .gte("created_at", actividadFrom)
    .lt("created_at", actividadTo);

  const rendQ = supabase
    .from("rendimiento")
    .select("agente_id, mes, encargos, ventas, contactos")
    .eq("anio", anio)
    .gte("mes", 1)
    .lte("mes", 12);

  const actividadQ = supabase
    .from("actividad_desarrollo")
    .select("agente_id, metric, value, occurred_at")
    .eq("empresa_id", user.empresaId ?? -1)              // filtro empresa explícito
    .gte("occurred_at", actividadFrom)
    .lt("occurred_at", actividadTo)
    .in("metric", ["encargos", "ventas", "contactos"]);

  const [
    { data: propiedadesData },
    { data: pedidosData },
    { data: tareasData },
    { data: tareasCompletadasData },
    { data: rendimientoData },
    { data: actividadData },
  ] = await Promise.all([propQ, pedidosQ, tareasQ, tareasCompletadasQ, rendQ, actividadQ]);

  type PropRow = {
    id: number; propietario: string | null; planta: string | null; puerta: string | null;
    estado: string | null; agente_asignado: number | null; finca_id: number | null;
    created_at: string | null;
  };
  type PedidoRow = {
    id: number; nombre_cliente: string; owner_user_id: number | null;
    zona_deseada: number | null; created_at: string | null;
  };
  type TareaRow = { id: number; estado: string; owner_user_id: number | null };
  type TareaCompRow = { owner_user_id: number | null };
  type RendRow = { agente_id: number; mes: number; encargos: number | null; ventas: number | null; contactos: number | null };
  type ActRow = { agente_id: number | null; metric: string | null; value: number | null; occurred_at: string };

  const propiedades = (propiedadesData ?? []) as PropRow[];
  const pedidos = (pedidosData ?? []) as PedidoRow[];
  const tareas = (tareasData ?? []) as TareaRow[];
  const tareasCompletadas = (tareasCompletadasData ?? []) as TareaCompRow[];
  const rendimiento = (rendimientoData ?? []) as RendRow[];
  const actividad = (actividadData ?? []) as ActRow[];

  // ── Timeline: última actividad ──────────────────────────────────────────

  const propIds = propiedades.map((p) => p.id);
  const pedidoIds = pedidos.map((p) => p.id);

  const [{ data: propTimeline }, { data: pedidoTimeline }] = await Promise.all([
    propIds.length
      ? supabase.from("contacto_timeline_events")
          .select("propiedad_id, created_at")
          .in("propiedad_id", propIds)
      : Promise.resolve({ data: [] }),
    pedidoIds.length
      ? supabase.from("contacto_timeline_events")
          .select("pedido_id, created_at")
          .in("pedido_id", pedidoIds)
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

  // ════════════════════════════════════════════════════════════════════════
  // MÉTRICAS
  // ════════════════════════════════════════════════════════════════════════

  // ── M1. Propiedades por estado ──────────────────────────────────────────

  const estadoCount = new Map<string, number>();
  for (const p of propiedades) {
    const e = (p.estado ?? "neutral").toLowerCase();
    estadoCount.set(e, (estadoCount.get(e) ?? 0) + 1);
  }

  const propiedadesPorEstado: PropiedadPorEstado[] = ESTADOS_ORDEN
    .filter((e) => estadoCount.has(e))
    .map((e) => ({ estado: e, total: estadoCount.get(e)! }));

  // Añadir estados que no estén en ESTADOS_ORDEN
  for (const [e, total] of estadoCount) {
    if (!ESTADOS_ORDEN.includes(e)) propiedadesPorEstado.push({ estado: e, total });
  }

  const totalPedidosActivos = pedidos.length;

  // ── M2. Zonas con más pedidos activos ───────────────────────────────────

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

  // ── M3. Zonas con más propiedades en encargo ────────────────────────────

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
      .map(([zona_id, enc]) => ({
        zona_id,
        zona_nombre: zonaMap.get(zona_id) ?? `Zona #${zona_id}`,
        encargos: enc,
      }))
      .sort((a, b) => b.encargos - a.encargos)
      .slice(0, 10);
  }

  // ── M4. Propiedades sin actividad ───────────────────────────────────────

  const propiedadesSinActividad: PropiedadSinActividad[] = propiedades
    .filter((p) => !p.estado?.toLowerCase().startsWith("vendid"))
    .map((p) => {
      const last = Math.max(lastPropActivity.get(p.id) ?? 0, toTime(p.created_at));
      const dias = last ? Math.floor((Date.now() - last) / 86_400_000) : PROPIEDAD_INACTIVA_DIAS;
      const label =
        p.propietario?.trim() ||
        [p.planta && `Planta ${p.planta}`, p.puerta && `Puerta ${p.puerta}`].filter(Boolean).join(" ") ||
        `Propiedad #${p.id}`;
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

  // ── M5. Conversión encargo→venta por agente ─────────────────────────────

  const agenteEncargos = new Map<number, number>();
  const agenteVentas = new Map<number, number>();
  const agenteContactos = new Map<number, number>();

  for (const act of actividad) {
    if (!act.agente_id) continue;
    const val = Number(act.value ?? 0);
    if (act.metric === "encargos") agenteEncargos.set(act.agente_id, (agenteEncargos.get(act.agente_id) ?? 0) + val);
    if (act.metric === "ventas") agenteVentas.set(act.agente_id, (agenteVentas.get(act.agente_id) ?? 0) + val);
    if (act.metric === "contactos") agenteContactos.set(act.agente_id, (agenteContactos.get(act.agente_id) ?? 0) + val);
  }

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

  // ── M6. Pedidos sin seguimiento por agente ──────────────────────────────

  const pedidosSinSeg = new Map<number, number>();
  for (const pedido of pedidos) {
    const ownerId = pedido.owner_user_id;
    if (!ownerId) continue;
    const last = lastPedidoActivity.get(pedido.id) ?? toTime(pedido.created_at);
    const days = last ? Math.floor((Date.now() - last) / 86_400_000) : PEDIDO_SIN_SEGUIMIENTO_DIAS;
    if (days >= PEDIDO_SIN_SEGUIMIENTO_DIAS) {
      pedidosSinSeg.set(ownerId, (pedidosSinSeg.get(ownerId) ?? 0) + 1);
    }
  }

  const agentesPedidosSinSeguimiento: AgentePedidosSinSeguimiento[] = agentList
    .map((a) => ({
      agente_id: a.id,
      agente_nombre: a.nombre,
      pedidos_sin_seguimiento: pedidosSinSeg.get(a.id) ?? 0,
    }))
    .filter((a) => a.pedidos_sin_seguimiento > 0)
    .sort((a, b) => b.pedidos_sin_seguimiento - a.pedidos_sin_seguimiento);

  // ── M7. Ranking: propiedades gestionadas por agente ─────────────────────

  const propPorAgente = new Map<number, number>();
  for (const p of propiedades) {
    if (!p.agente_asignado) continue;
    propPorAgente.set(p.agente_asignado, (propPorAgente.get(p.agente_asignado) ?? 0) + 1);
  }

  const rankingPropiedadesGestionadas: AgenteRankingRow[] = agentList
    .map((a) => ({ agente_id: a.id, agente_nombre: a.nombre, valor: propPorAgente.get(a.id) ?? 0 }))
    .filter((a) => a.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  // ── M8. Ranking: tareas completadas por agente (en el periodo) ──────────

  const tareasCompPorAgente = new Map<number, number>();
  for (const t of tareasCompletadas) {
    if (!t.owner_user_id) continue;
    tareasCompPorAgente.set(t.owner_user_id, (tareasCompPorAgente.get(t.owner_user_id) ?? 0) + 1);
  }

  const rankingTareasCompletadas: AgenteRankingRow[] = agentList
    .map((a) => ({ agente_id: a.id, agente_nombre: a.nombre, valor: tareasCompPorAgente.get(a.id) ?? 0 }))
    .filter((a) => a.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  // ── M9. Agentes sin responsable asignado ────────────────────────────────
  // Solo Administrador/Director ven esta métrica (implica ver toda la empresa)

  let agenteSinResponsable: AgenteSinResponsable[] = [];
  if (user.role === "Administrador" || user.role === "Director") {
    const { data: sinResp } = await supabase
      .from("usuarios")
      .select("id, nombre, apellidos, correo, rol")
      .eq("empresa_id", user.empresaId ?? -1)
      .eq("rol", "Agente")
      .is("supervisor_id", null)
      .eq("estado", "active");

    type SinRespRow = { id: number; nombre: string; apellidos: string; correo: string; rol: string };
    agenteSinResponsable = ((sinResp ?? []) as SinRespRow[]).map((u) => ({
      id: u.id,
      nombre: `${u.nombre} ${u.apellidos}`.trim(),
      correo: u.correo,
      rol: u.rol,
    }));
  }

  // ── M10. Usuarios inactivos con tareas o pedidos abiertos ───────────────

  let usuariosInactivosConPendientes: UsuarioInactivoConPendientes[] = [];
  if (user.role === "Administrador" || user.role === "Director") {
    const { data: inactivos } = await supabase
      .from("usuarios")
      .select("id, nombre, apellidos, correo")
      .eq("empresa_id", user.empresaId ?? -1)
      .eq("estado", "disabled");

    type InactivoRow = { id: number; nombre: string; apellidos: string; correo: string };
    const inactivoList = (inactivos ?? []) as InactivoRow[];

    if (inactivoList.length > 0) {
      const inactivoIds = inactivoList.map((u) => u.id);

      const [{ data: tareasAbiertas }, { data: pedidosAbiertos }] = await Promise.all([
        supabase.from("tareas")
          .select("owner_user_id")
          .in("owner_user_id", inactivoIds)
          .eq("estado", "pendiente")
          .is("archived_at", null),
        supabase.from("pedidos")
          .select("owner_user_id")
          .in("owner_user_id", inactivoIds)
          .eq("empresa_id", user.empresaId ?? -1),
      ]);

      const tareasPorUser = new Map<number, number>();
      for (const t of (tareasAbiertas ?? []) as Array<{ owner_user_id: number | null }>) {
        if (t.owner_user_id) tareasPorUser.set(t.owner_user_id, (tareasPorUser.get(t.owner_user_id) ?? 0) + 1);
      }

      const pedidosPorUser = new Map<number, number>();
      for (const p of (pedidosAbiertos ?? []) as Array<{ owner_user_id: number | null }>) {
        if (p.owner_user_id) pedidosPorUser.set(p.owner_user_id, (pedidosPorUser.get(p.owner_user_id) ?? 0) + 1);
      }

      usuariosInactivosConPendientes = inactivoList
        .map((u) => ({
          id: u.id,
          nombre: `${u.nombre} ${u.apellidos}`.trim(),
          correo: u.correo,
          tareas_abiertas: tareasPorUser.get(u.id) ?? 0,
          pedidos_abiertos: pedidosPorUser.get(u.id) ?? 0,
        }))
        .filter((u) => u.tareas_abiertas > 0 || u.pedidos_abiertos > 0)
        .sort((a, b) => (b.tareas_abiertas + b.pedidos_abiertos) - (a.tareas_abiertas + a.pedidos_abiertos));
    }
  }

  // ── M11. Evolución mensual ──────────────────────────────────────────────

  const pedidosPorMes = new Array(12).fill(0);
  for (const p of pedidos) {
    const d = new Date(p.created_at ?? "");
    if (d.getFullYear() === anio) pedidosPorMes[d.getMonth()] += 1;
  }

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

  // Suprimir advertencia sobre variable no usada
  void tareas;

  return {
    propiedadesPorEstado,
    totalPedidosActivos,
    zonasPedidos,
    zonasEncargos,
    propiedadesSinActividad,
    agentesConversion,
    agentesPedidosSinSeguimiento,
    rankingPropiedadesGestionadas,
    rankingTareasCompletadas,
    agenteSinResponsable,
    usuariosInactivosConPendientes,
    evolucionMensual,
    agentes: agentList,
    zonas: zonas.map((z) => ({ id: z.id, nombre: z.nombre })),
    anio,
  };
}
