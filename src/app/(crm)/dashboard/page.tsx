import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { getPeriodRange, mergeRendimientoRows } from "@/lib/desarrollo-metrics";
import {
  emptyRendimiento,
  type SummaryData,
  type SummaryType,
  type PropertyListing,
  type AgentMetrics,
  type Rendimiento,
  type KanbanData,
  type KanbanCardData,
  type OrdenDiaAgente,
  type KanbanPriority,
} from "@/lib/mock/dashboard";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import OrdenDiaPanel from "@/components/dashboard/OrdenDiaPanel";
import AgentOfMonth from "@/components/dashboard/AgentOfMonth";
import AgentPerformanceTable from "@/components/dashboard/AgentPerformanceTable";
import MyActivity from "@/components/dashboard/MyActivity";
import MapaDashboardLazy from "@/components/dashboard/MapaDashboardLazy";
import type { NoticiaMapPoint } from "@/components/dashboard/MapaDashboard";
import { combineLocalDateTime, localDateKey, normalizeTime } from "@/lib/local-date-time";
import { normalizeAgendaEvent } from "@/lib/agenda/normalize-agenda-event";
import { rolloverOverdueAgendaToPendingTasks } from "@/lib/agenda/rollover-overdue-agenda";
import { normalizeActivityType } from "@/lib/activity-options";
import { filterReadablePedidos } from "@/lib/pedidos-access";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function formatDateEs() {
  return new Date()
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^./, (c) => c.toUpperCase());
}

function normalizePriority(p: string | null): KanbanPriority {
  if (p === "alta" || p === "media" || p === "baja") return p;
  return "media";
}

function normalizeNullablePriority(p: string | null): KanbanPriority | null {
  if (p === null) return null;
  if (p === "alta" || p === "media" || p === "baja") return p;
  return "media";
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const agendaAdmin = createAdminClient();
  const yo = await getCurrentUserContext();

  const role = yo?.role ?? "Agente";
  const userName = yo?.nombre ?? "Usuario";
  const userId = yo?.id ?? 0;
  const fullName = yo ? `${yo.nombre} ${yo.apellidos}`.trim() : "Usuario";
  const anioActual = new Date().getFullYear();
  const periodRange = getPeriodRange(anioActual, 0);
  const today = localDateKey();

  const isManager = role === "Administrador" || role === "Director";

  await rolloverOverdueAgendaToPendingTasks({
    empresaId: yo?.empresaId ?? null,
    today,
  });

  // ─── 0. Calcular filtros de acceso ──────────────────────────────────────
  // fincaIdFilter: null = sin restricción, [] = sin acceso, [ids] = filtrar
  let fincaIdFilter: number[] | null = null;
  // agentIdFilter: null = sin restricción, [ids] = solo estos agentes
  let agentIdFilter: number[] | null = null;
  let assignedPropiedadIds: number[] = [];
  // pedidoAgentFilter: null = sin restricción, [ids] = solo estos
  let pedidoAgentFilter: number[] | null = null;

  if (!isManager) {
    // Obtener zonas accesibles del usuario
    const { data: accesos } = await supabase
      .from("zona_acceso")
      .select("zona_id")
      .eq("usuario_id", userId);

    const zonaIds = (accesos ?? []).map((a) => a.zona_id);

    if (zonaIds.length > 0) {
      // Resolver finca IDs en esas zonas
      const { data: sectoresData } = await supabase
        .from("sectores")
        .select("fincas(id)")
        .in("zona_id", zonaIds);

      type SectorWithFincas = { fincas: { id: number }[] | null };
      fincaIdFilter = ((sectoresData ?? []) as unknown as SectorWithFincas[]).flatMap(
        (s) => (Array.isArray(s.fincas) ? s.fincas.map((f) => f.id) : [])
      );
    } else {
      // Sin zonas asignadas → no ve nada de propiedades
      fincaIdFilter = [];
    }

    // Filtro de agente: cada rol ve sus propias propiedades/pedidos
    if (role === "Agente") {
      agentIdFilter = [userId];
      pedidoAgentFilter = [userId];
    } else if (role === "Responsable") {
      const supervised = [userId, ...(yo?.supervisedAgentIds ?? [])];
      agentIdFilter = supervised;
      pedidoAgentFilter = supervised;
    }

    if (agentIdFilter && agentIdFilter.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignedRows } = await (supabase as any)
        .from("propiedad_usuarios")
        .select("propiedad_id")
        .in("usuario_id", agentIdFilter);
      assignedPropiedadIds = Array.from(new Set(
        ((assignedRows ?? []) as Array<{ propiedad_id: number }>).map((row) => row.propiedad_id),
      ));
    }
  }

  // Aplica filtros de zona/agente a una query builder de propiedades
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyPropFilters(query: any): any {
    let q = query;
    if (agentIdFilter !== null) {
      if (agentIdFilter.length === 0) return q.eq("id", -1);
      return q.or([
        `agente_asignado.in.(${agentIdFilter.join(",")})`,
        `owner_user_id.in.(${agentIdFilter.join(",")})`,
        assignedPropiedadIds.length ? `id.in.(${assignedPropiedadIds.join(",")})` : "id.eq.-1",
      ].join(","));
    }
    if (fincaIdFilter !== null) {
      q = fincaIdFilter.length === 0 ? q.eq("id", -1) : q.in("finca_id", fincaIdFilter);
    }
    return q;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyPedidoFilters(query: any): any {
    let q = query;
    if (yo?.empresaId != null) {
      q = q.eq("empresa_id", yo.empresaId);
    }
    if (pedidoAgentFilter === null) return q;
    return pedidoAgentFilter.length === 0
      ? q.eq("owner_user_id", -1)
      : q.in("owner_user_id", pedidoAgentFilter);
  }

  // ─── 1. Summary counts + listings (paralelo) ────────────────────────────
  const propSelect = "id, planta, puerta, propietario, estado, fincas(id, numero, sectores(id, numero, zona_id)), usuarios:usuarios!propiedades_agente_asignado_fkey(nombre, apellidos)";

  const [
    { count: noticiasCount },
    { count: investigacionesCount },
    { count: encargosCount },
    { count: pedidosCount },
    { data: noticiasList },
    { data: investigacionesList },
    { data: encargosList },
    { data: pedidosList },
    { data: todosAgentes },
    { data: rendimientoData },
    { data: actividadData },
    { data: tareasData },
    { data: agendaData, error: agendaError },
    { data: kanbanColsData },
    { data: kanbanOrderData },
    { data: agenteMesData },
    { data: noticiasMapData },
    { data: encargosMapData },
  ] = await Promise.all([
    applyPropFilters(supabase.from("propiedades").select("id", { count: "exact", head: true }).ilike("estado", "noticia")),
    applyPropFilters(supabase.from("propiedades").select("id", { count: "exact", head: true }).ilike("estado", "investig%")),
    applyPropFilters(supabase.from("propiedades").select("id", { count: "exact", head: true }).ilike("estado", "encarg%")),
    applyPedidoFilters(supabase.from("pedidos").select("id", { count: "exact", head: true })),

    applyPropFilters(
      supabase.from("propiedades").select(propSelect).ilike("estado", "noticia").order("id", { ascending: false }).limit(50)
    ),
    applyPropFilters(
      supabase.from("propiedades").select(propSelect).ilike("estado", "investig%").order("id", { ascending: false }).limit(50)
    ),
    applyPropFilters(
      supabase.from("propiedades").select(propSelect).ilike("estado", "encarg%").order("id", { ascending: false }).limit(50)
    ),
    applyPedidoFilters(
      supabase.from("pedidos").select(
        "id, nombre_cliente, tipo_propiedad, owner_user_id, empresa_id, equipo_id, visibility, visibility_agente_ids, zona:zona_deseada(nombre), usuarios:usuarios!pedidos_owner_user_id_fkey(nombre, apellidos)"
      ).order("id", { ascending: false }).limit(50)
    ),

    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    supabase.from("rendimiento").select("agente_id, anio, mes, facturado, objetivo_facturado, encargos, objetivo_encargos, ventas, objetivo_ventas, contactos, objetivo_contactos").eq("anio", anioActual).eq("mes", 0),
    supabase
      .from("actividad_desarrollo")
      .select("agente_id, metric, value")
      .gte("occurred_at", periodRange.from)
      .lt("occurred_at", periodRange.to),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("tareas")
      .select("id, titulo, prioridad, fecha, estado, resultado, from_orden_dia, owner_user_id, tarea_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .is("fecha", null)
      .in("estado", ["pendiente", "completado"])
      .order("id", { ascending: false }),

    agendaAdmin
      .from("agenda")
      .select("id, description, event_date, time, priority, completed, result, gcal_event_id, user_id, owner_user_id, empresa_id, equipo_id, visibility, tipo, archived_at, archived_reason, converted_to_tarea_id, created_at, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .eq("empresa_id", yo?.empresaId ?? -1)
      .eq("event_date", today),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("kanban_columnas")
      .select("col_id, titulo, orden")
      .eq("user_id", userId)
      .order("orden", { ascending: true }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("kanban_card_orden")
      .select("source, db_id, column_id, posicion")
      .eq("user_id", userId),

    yo?.empresaId
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("agente_del_mes")
          .select("id, mes, premio, agente_id, agente_nombre, anadido_por")
          .eq("empresa_id", yo.empresaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    applyPropFilters(
      supabase.from("propiedades")
        .select("id, propietario, planta, puerta, latitud, longitud, finca_id, fincas(id, numero, sector_id, sectores(id, numero, zona_id))")
        .ilike("estado", "noticia")
        .not("latitud", "is", null)
        .not("longitud", "is", null)
    ),
    applyPropFilters(
      supabase.from("propiedades")
        .select("id, propietario, planta, puerta, latitud, longitud, finca_id, fincas(id, numero, sector_id, sectores(id, numero, zona_id))")
        .ilike("estado", "encargo")
        .not("latitud", "is", null)
        .not("longitud", "is", null)
    ),
  ]);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[dashboard] agenda-query params", {
      userId, role, empresaId: yo?.empresaId, today,
      agendaCount: agendaData?.length ?? "null",
    });
    if (agendaError) {
      console.error("[dashboard] Error cargando agenda:", {
        message: agendaError?.message,
        details: agendaError?.details,
        hint: agendaError?.hint,
        code: agendaError?.code,
        raw: JSON.stringify(agendaError, Object.getOwnPropertyNames(agendaError)),
      });
      console.error("[dashboard] agendaError raw direct", agendaError);
    }
  }

  // ─── 2. Summary data ─────────────────────────────────────────────────────
  const summary: SummaryData = {
    noticias: noticiasCount ?? 0,
    investigaciones: investigacionesCount ?? 0,
    encargos: encargosCount ?? 0,
    pedidosActivos: pedidosCount ?? 0,
  };

  type PropRow = {
    id: number;
    planta: string | null;
    puerta: string | null;
    propietario: string | null;
    estado: string | null;
    fincas: { id: number; numero: string; sectores: { id: number; numero: number; zona_id: number } | null } | null;
    usuarios: { nombre: string | null; apellidos: string | null } | null;
  };

  function mapPropiedad(p: PropRow): PropertyListing {
    const planta = p.planta ?? "";
    const puerta = p.puerta ?? "";
    const nombre = p.propietario?.trim()
      ? p.propietario
      : planta || puerta
        ? `Planta ${planta}${puerta ? ` ${puerta}` : ""}`.trim()
        : `Propiedad #${p.id}`;
    const finca = p.fincas?.numero != null ? p.fincas.numero : "—";
    const sector = p.fincas?.sectores?.numero != null ? `Sector ${p.fincas.sectores.numero}` : "—";
    const agente = p.usuarios
      ? `${p.usuarios.nombre ?? ""} ${p.usuarios.apellidos ?? ""}`.trim() || "Sin asignar"
      : "Sin asignar";
    return {
      id: String(p.id),
      nombre,
      sector,
      finca,
      estado: p.estado ?? "—",
      agente,
      fincaId: p.fincas?.id,
      sectorId: p.fincas?.sectores?.id,
      zonaId: p.fincas?.sectores?.zona_id,
    };
  }

  type PedidoRow = {
    id: number;
    nombre_cliente: string;
    tipo_propiedad: string | null;
    owner_user_id: number | null;
    empresa_id: number | null;
    equipo_id: number | null;
    visibility: string | null;
    visibility_agente_ids: number[] | null;
    zona: { nombre: string | null } | null;
    usuarios: { nombre: string | null; apellidos: string | null } | null;
  };

  function mapPedido(p: PedidoRow): PropertyListing {
    return {
      id: String(p.id),
      nombre: p.nombre_cliente,
      sector: p.zona?.nombre ?? "—",
      finca: p.tipo_propiedad ?? "—",
      estado: "Activo",
      agente: p.usuarios
        ? `${p.usuarios.nombre ?? ""} ${p.usuarios.apellidos ?? ""}`.trim() || "Sin asignar"
        : "Sin asignar",
      detailHref: `/solicitudes/${p.id}`,
    };
  }

  const listings: Record<SummaryType, PropertyListing[]> = {
    noticias: ((noticiasList ?? []) as unknown as PropRow[]).map(mapPropiedad),
    investigaciones: ((investigacionesList ?? []) as unknown as PropRow[]).map(mapPropiedad),
    encargos: ((encargosList ?? []) as unknown as PropRow[]).map(mapPropiedad),
    pedidosActivos: filterReadablePedidos((pedidosList ?? []) as unknown as PedidoRow[], yo).map(mapPedido),
  };

  // ─── 3. Agentes filtrados por rol ────────────────────────────────────────
  // Los administradores no aparecen en el Orden del día ni en el panel de rendimiento
  let visibleAgentes = (todosAgentes ?? []).filter(
    (a) => a.rol?.toLowerCase() !== "administrador" && a.rol?.toLowerCase() !== "admin",
  );
  if (role === "Responsable") {
    const allowed = new Set([userId, ...(yo?.supervisedAgentIds ?? [])]);
    visibleAgentes = visibleAgentes.filter((a) => allowed.has(a.id));
  } else if (role === "Agente") {
    visibleAgentes = visibleAgentes.filter((a) => a.id === userId);
  }

  const rendimientoMap = mergeRendimientoRows({
    agentes: visibleAgentes,
    objetivos: rendimientoData ?? [],
    actividades: actividadData ?? [],
    anio: anioActual,
    mes: 0,
  });

  const agentMetrics: AgentMetrics[] = visibleAgentes.map((a) => {
    const r = rendimientoMap[a.id];
    const rendimiento: Rendimiento = r
      ? {
          facturado: r.facturado,
          objetivo_facturado: r.objetivo_facturado,
          encargos: r.encargos,
          objetivo_encargos: r.objetivo_encargos,
          ventas: r.ventas,
          objetivo_ventas: r.objetivo_ventas,
          contactos: r.contactos,
          objetivo_contactos: r.objetivo_contactos,
        }
      : emptyRendimiento();
    return {
      id: String(a.id),
      nombre: `${a.nombre} ${a.apellidos}`.trim(),
      rendimiento,
    };
  });

  const ownMetrics =
    agentMetrics.find((a) => a.id === String(userId))?.rendimiento ?? emptyRendimiento();

  // ─── 4. Kanban personal ──────────────────────────────────────────────────
  type TareaDbRow = {
    id: number;
    titulo: string;
    prioridad: string | null;
    fecha: string | null;
    estado: string;
    resultado?: string | null;
    from_orden_dia?: boolean | null;
    owner_user_id: number;
    tarea_usuarios?: Array<{ usuario_id: number; usuarios?: { nombre: string | null; apellidos: string | null } | null }>;
  };

  type AgendaDbRow = {
    id: number;
    description: string;
    event_date: string;
    time: string | null;
    priority: string | null;
    tipo: string | null;
    completed: boolean;
    result: string | null;
    gcal_event_id?: string | null;
    user_id: number | null;
    owner_user_id: number | null;
    empresa_id?: number | null;
    created_at?: string | null;
    agenda_usuarios?: Array<{ usuario_id: number; usuarios?: { nombre: string | null; apellidos: string | null } | null }>;
  };

  function assignedIdsFromRows(rows?: Array<{ usuario_id: number }>) {
    return rows?.map((r) => r.usuario_id) ?? [];
  }

  function assignedNamesFromRows(rows?: Array<{ usuarios?: { nombre: string | null; apellidos: string | null } | null }>) {
    return (rows ?? [])
      .map((r) => `${r.usuarios?.nombre ?? ""} ${r.usuarios?.apellidos ?? ""}`.trim())
      .filter(Boolean);
  }

  type KanbanOrderRow = {
    source: "tarea" | "agenda";
    db_id: number;
    column_id: string;
    posicion: number;
  };

  const kanbanOrderMap = new Map(
    ((kanbanOrderData ?? []) as KanbanOrderRow[]).map((row) => [
      `${row.column_id}:${row.source}:${row.db_id}`,
      row.posicion,
    ]),
  );

  function sortKanbanCards(columnId: string, cards: KanbanCardData[]) {
    return [...cards].sort((a, b) => {
      const aOrder = kanbanOrderMap.get(`${columnId}:${a.source}:${a.dbId}`);
      const bOrder = kanbanOrderMap.get(`${columnId}:${b.source}:${b.dbId}`);
      if (aOrder != null && bOrder != null) return aOrder - bOrder;
      if (aOrder != null) return -1;
      if (bOrder != null) return 1;
      return 0;
    });
  }

  const tareas: TareaDbRow[] = (tareasData ?? []) as TareaDbRow[];
  const agendaRows = ((agendaData ?? []) as AgendaDbRow[]).filter((row) => {
    if (role === "Administrador" || role === "Director") return true;
    const assigned = assignedIdsFromRows(row.agenda_usuarios);
    if (role === "Responsable") {
      const allowed = new Set([userId, ...(yo?.supervisedAgentIds ?? [])]);
      return assigned.some((id) => allowed.has(id))
        || (row.owner_user_id != null && allowed.has(row.owner_user_id))
        || (row.user_id != null && allowed.has(row.user_id));
    }
    return assigned.includes(userId) || row.owner_user_id === userId || row.user_id === userId;
  });

  const agendaHoy: AgendaDbRow[] = agendaRows.map((row) => {
    const normalized = normalizeAgendaEvent(row);
    return {
      ...row,
      description: normalized.title,
      event_date: normalized.date,
      time: normalized.timeLabel,
    };
  });
  const myTareas = tareas.filter((t) => assignedIdsFromRows(t.tarea_usuarios).includes(userId) || t.owner_user_id === userId);
  const myAgendaHoy = agendaHoy.filter((a) => assignedIdsFromRows(a.agenda_usuarios).includes(userId) || a.owner_user_id === userId || a.user_id === userId);

  function toCard(t: TareaDbRow) {
    return {
      id: `tarea-${t.id}`,
      source: "tarea" as const,
      dbId: t.id,
      title: t.titulo,
      priority: normalizePriority(t.prioridad),
      dueDate: t.fecha ?? undefined,
      time: null,
      assignedBy: null,
      assignedUserIds: assignedIdsFromRows(t.tarea_usuarios),
      assignedUsers: assignedNamesFromRows(t.tarea_usuarios),
      resultado: t.resultado ?? null,
      isCompleted: t.estado === "completado",
      fromOrdenDia: t.from_orden_dia ?? false,
    };
  }

  function agendaToCard(a: AgendaDbRow) {
    return {
      id: `agenda-${a.id}`,
      source: "agenda" as const,
      dbId: a.id,
      title: a.description,
      priority: normalizePriority(a.priority),
      tipo: normalizeActivityType(a.tipo),
      dueDate: combineLocalDateTime(a.event_date, normalizeTime(a.time, "09:00")),
      time: normalizeTime(a.time, "09:00"),
      assignedBy: null,
      assignedUserIds: assignedIdsFromRows(a.agenda_usuarios),
      assignedUsers: assignedNamesFromRows(a.agenda_usuarios),
      resultado: a.result ?? null,
      isCompleted: a.completed,
      fromOrdenDia: true,
      gcalEventId: a.gcal_event_id ?? null,
    };
  }

  const kanbanData: KanbanData = {
    columns: [
      {
        id: "pendientes",
        title: "Pendientes",
        fixed: true,
        // Pendientes primero, luego completadas al final con tachado
        cards: sortKanbanCards("pendientes", [
          ...myTareas.filter((t) => t.estado === "pendiente").map(toCard),
          ...myTareas.filter((t) => t.estado === "completado").map(toCard),
        ]),
      },
      {
        id: "en_progreso",
        title: "Orden del dia",
        fixed: true,
        cards: sortKanbanCards("en_progreso", [
          ...myAgendaHoy.filter((a) => !a.completed).map(agendaToCard),
          ...myAgendaHoy.filter((a) => a.completed).map(agendaToCard),
        ]),
      },
    ],
  };

  // ─── 5. Orden del día por agente (managers) ──────────────────────────────
  const showOrdenDia =
    role === "Administrador" || role === "Director" || role === "Responsable";

  const ordenDiaAgentes: OrdenDiaAgente[] = showOrdenDia
    ? visibleAgentes.map((a) => ({
        id: a.id,
        nombre: `${a.nombre} ${a.apellidos}`.trim(),
        tareas: agendaHoy
          .filter((t) => assignedIdsFromRows(t.agenda_usuarios).includes(a.id) || t.owner_user_id === a.id || t.user_id === a.id)
          .map((t) => ({
            id: t.id,
            titulo: t.description,
            prioridad: normalizeNullablePriority(t.priority),
            fecha: t.event_date,
            time: normalizeTime(t.time, "09:00"),
            estado: t.completed ? "completado" : "en_progreso",
            resultado: t.result ?? null,
            assignedUsers: assignedNamesFromRows(t.agenda_usuarios),
          })),
      }))
    : [];

  // ─── 6. Role gates ───────────────────────────────────────────────────────
  const showAgentPerformance =
    role === "Administrador" || role === "Director" || role === "Responsable";
  const showMyActivity = role === "Agente";

  // ─── 7. Mapa de noticias ─────────────────────────────────────────────────
  type NoticiasMapRow = {
    id: number;
    propietario: string | null;
    planta: string | null;
    puerta: string | null;
    latitud: number;
    longitud: number;
    finca_id: number | null;
    fincas: { id: number; numero: string; sector_id: number | null; sectores: { id: number; numero: number; zona_id: number | null } | null } | null;
  };
  const mapRowToPoint = (n: NoticiasMapRow): NoticiaMapPoint => ({
    id: n.id,
    propietario: n.propietario,
    planta: n.planta,
    puerta: n.puerta,
    latitud: n.latitud,
    longitud: n.longitud,
    finca: n.fincas?.numero ?? "—",
    sector: n.fincas?.sectores ? `Sector ${n.fincas.sectores.numero}` : "—",
    fincaId: n.fincas?.id ?? null,
    sectorId: n.fincas?.sectores?.id ?? null,
    zonaId: n.fincas?.sectores?.zona_id ?? null,
  });

  const noticiasMap: NoticiaMapPoint[] = ((noticiasMapData ?? []) as unknown as NoticiasMapRow[]).map(mapRowToPoint);
  const encargosMap: NoticiaMapPoint[] = ((encargosMapData ?? []) as unknown as NoticiasMapRow[]).map(mapRowToPoint);

  return (
    <div className="flex flex-col gap-8">
      {/* 1 — Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {getGreeting()}, {userName}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{formatDateEs()}</p>
      </div>

      {/* 2 — Summary panel */}
      <SummaryPanel summary={summary} listings={listings} />

      {/* 4 — Mis tareas (Kanban) */}
      <section className="min-w-0">
        <div className="mb-4">
          <h2 className="font-semibold text-text-primary">Mis tareas</h2>
          <p className="text-sm text-text-secondary">
            Organiza tu trabajo arrastrando las tarjetas entre columnas.
          </p>
        </div>
        <KanbanBoard
          key={JSON.stringify(kanbanData.columns.map((column) => ({
            id: column.id,
            cards: column.cards.map((card) => ({
              id: card.id,
              title: card.title,
              priority: card.priority,
              tipo: card.tipo,
              dueDate: card.dueDate,
              isCompleted: card.isCompleted,
              assignedUserIds: card.assignedUserIds,
              gcalEventId: card.gcalEventId,
            })),
          })))}
          initialData={kanbanData}
          customColumns={(kanbanColsData ?? []).map((c: { col_id: string; titulo: string }) => ({ id: c.col_id, title: c.titulo }))}
          role={role}
          currentUserId={String(userId)}
          agents={agentMetrics.map((a) => ({ id: a.id, nombre: a.nombre }))}
        />
      </section>

      {/* 5 — Orden del día + Mapa (grid en desktop grande, mapa primero en móvil) */}
      {showOrdenDia ? (
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" style={{ minHeight: 480 }}>
          <div className="order-2 flex xl:order-1">
            <OrdenDiaPanel agentes={ordenDiaAgentes} />
          </div>
          <div className="order-1 flex xl:order-2">
            <MapaDashboardLazy noticias={noticiasMap} encargos={encargosMap} />
          </div>
        </div>
      ) : (
        <MapaDashboardLazy noticias={noticiasMap} encargos={encargosMap} />
      )}

      {/* 7 — Agente del mes */}
      <AgentOfMonth
        initialData={
          agenteMesData
            ? {
                id: agenteMesData.id,
                mes: agenteMesData.mes,
                premio: agenteMesData.premio,
                agente: agenteMesData.agente_nombre ?? null,
                agenteId: agenteMesData.agente_id ?? null,
                añadidoPor: agenteMesData.anadido_por,
              }
            : null
        }
        empresaId={yo?.empresaId ?? null}
        role={role}
        currentUserName={fullName}
        agents={agentMetrics.map((a) => ({ id: a.id, nombre: a.nombre }))}
      />

      {/* 8 — Rendimiento / Mi actividad */}
      {showAgentPerformance && <AgentPerformanceTable agents={agentMetrics} role={role} />}
      {showMyActivity && <MyActivity rendimiento={ownMetrics} role={role} />}
    </div>
  );
}
