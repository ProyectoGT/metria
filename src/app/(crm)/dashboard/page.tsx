import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { getPeriodRange, mergeRendimientoRows } from "@/modules/desarrollo/services/desarrollo-metrics";
import { getNextBestActions } from "@/modules/dashboard/services/next-actions";
import { generateAndFetchSuggestions } from "@/modules/dashboard/services/pipeline-suggestions";
import { detectLostOpportunities } from "@/modules/dashboard/services/opportunities";
import { listZonasGeograficas } from "@/modules/zonas-geograficas/services/actions";
import {
  emptyRendimiento,
  type SummaryData,
  type SummaryType,
  type PropertyListing,
  type AgentMetrics,
  type Rendimiento,
  type KanbanData,
  type OrdenDiaAgente,
  type KanbanPriority,
} from "@/lib/mock/dashboard";
import DashboardWorkspace from "@/modules/dashboard/components/DashboardWorkspace";
import type { NoticiaMapPoint } from "@/modules/dashboard/components/MapaDashboard";
import { combineLocalDateTime, formatLocalDateEs, localDateKey, normalizeTime } from "@/lib/local-date-time";
import { normalizeAgendaEvent } from "@/modules/calendario/services/normalize-agenda-event";
import { normalizeActivityType } from "@/lib/activity-options";

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  const yo = await getCurrentUserContext();

  const role = yo?.role ?? "Agente";
  const userName = yo?.nombre ?? "Usuario";
  const userId = yo?.id ?? 0;
  const fullName = yo ? `${yo.nombre} ${yo.apellidos}`.trim() : "Usuario";
  const anioActual = new Date().getFullYear();
  const currentDateLabel = formatLocalDateEs(localDateKey());
  const periodRange = getPeriodRange(anioActual, 0);
  const nextBestActionsPromise = getNextBestActions(yo);
  const pipelineSuggestionsPromise = yo ? generateAndFetchSuggestions(yo) : Promise.resolve([]);
  const lostOpportunitiesPromise = yo ? detectLostOpportunities(yo) : Promise.resolve([]);

  const isManager = role === "Administrador" || role === "Director";

  // ─── 0. Calcular filtros de acceso ──────────────────────────────────────
  // fincaIdFilter: null = sin restricción, [] = sin acceso, [ids] = filtrar
  let fincaIdFilter: number[] | null = null;
  // agentIdFilter: null = sin restricción, [ids] = solo estos agentes
  let agentIdFilter: number[] | null = null;
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
  }

  // Aplica filtros de zona/agente a una query builder de propiedades
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyPropFilters(query: any): any {
    let q = query;
    if (fincaIdFilter !== null) {
      q = fincaIdFilter.length === 0 ? q.eq("id", -1) : q.in("finca_id", fincaIdFilter);
    }
    if (agentIdFilter !== null) {
      q = agentIdFilter.length === 0 ? q.eq("agente_asignado", -1) : q.in("agente_asignado", agentIdFilter);
    }
    return q;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyPedidoFilters(query: any): any {
    if (pedidoAgentFilter === null) return query;
    return pedidoAgentFilter.length === 0
      ? query.eq("owner_user_id", -1)
      : query.in("owner_user_id", pedidoAgentFilter);
  }

  // ─── 1. Summary counts + listings (paralelo) ────────────────────────────
  const propSelect = "id, planta, puerta, propietario, estado, fincas(id, numero, sectores(id, numero, zona_id, zona(nombre))), usuarios:usuarios!propiedades_agente_asignado_fkey(nombre, apellidos)";

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
    { data: agendaData },
    { data: kanbanColsData },
    { data: agenteMesData },
    { data: noticiasMapData },
    { data: encargosMapData },
    nextBestActions,
    pipelineSuggestions,
    lostOpportunities,
    zonasGeograficas,
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
        "id, nombre_cliente, tipo_propiedad, zona:zona_deseada(nombre), usuarios:usuarios!pedidos_owner_user_id_fkey(nombre, apellidos)"
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
      .in("estado", ["pendiente", "completado"])
      .order("id", { ascending: false }),

    createAdminClient()
      .from("agenda")
      .select("id, description, event_date, time, time_end, priority, tipo, completed, result, reminder_minutes_before, gcal_event_id, user_id, owner_user_id, empresa_id, created_at, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .eq("event_date", localDateKey())
      .eq("empresa_id", yo?.empresaId ?? -1)
      .order("time", { ascending: true, nullsFirst: false }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("kanban_columnas")
      .select("col_id, titulo, orden")
      .eq("user_id", userId)
      .order("orden", { ascending: true }),

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
    nextBestActionsPromise,
    pipelineSuggestionsPromise,
    lostOpportunitiesPromise,
    listZonasGeograficas(),
  ]);

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
    fincas: { id: number; numero: string; sectores: { id: number; numero: number; zona_id: number; zona: { nombre: string | null } | null } | null } | null;
    usuarios: { nombre: string | null; apellidos: string | null } | null;
  };

  function mapPropiedad(p: PropRow): PropertyListing {
    const planta = p.planta ?? "";
    const puerta = p.puerta ?? "";
    const nombre = planta || puerta
      ? `Planta ${planta}${puerta ? ` ${puerta}` : ""}`.trim()
      : `Propiedad #${p.id}`;
    const finca = p.fincas?.numero != null ? p.fincas.numero : "—";
    const sector = p.fincas?.sectores?.numero != null ? `Sector ${p.fincas.sectores.numero}` : "—";
    const zona = p.fincas?.sectores?.zona?.nombre ?? sector;
    const agente = p.usuarios
      ? `${p.usuarios.nombre ?? ""} ${p.usuarios.apellidos ?? ""}`.trim() || "Sin asignar"
      : "Sin asignar";
    return {
      id: String(p.id),
      nombre,
      sector,
      finca,
      zona,
      propietario: p.propietario?.trim() || "—",
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
    pedidosActivos: ((pedidosList ?? []) as unknown as PedidoRow[]).map(mapPedido),
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
    time_end: string | null;
    priority: string | null;
    tipo: string | null;
    completed: boolean;
    result: string | null;
    reminder_minutes_before: number | null;
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

  const tareas: TareaDbRow[] = (tareasData ?? []) as TareaDbRow[];

  // Filtrar filas de agenda por rol (usando admin client, aplicamos el filtro en JS)
  if (process.env.NODE_ENV !== "production" && agendaData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agendaError = (agendaData as any)?.error;
    if (agendaError) {
      console.error("[dashboard] Error cargando agenda:", {
        message: agendaError?.message,
        details: agendaError?.details,
        hint: agendaError?.hint,
        code: agendaError?.code,
        raw: JSON.stringify(agendaError, Object.getOwnPropertyNames(agendaError)),
      });
    }
  }

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
  const myAgendaHoy = agendaHoy.filter((a) => assignedIdsFromRows(a.agenda_usuarios).includes(userId) || a.user_id === userId);

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
      timeEnd: a.time_end ?? null,
      reminderMinutesBefore: a.reminder_minutes_before ?? null,
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
        cards: [
          ...myTareas.filter((t) => t.estado === "pendiente").map(toCard),
          ...myTareas.filter((t) => t.estado === "completado").map(toCard),
        ],
      },
      {
        id: "en_progreso",
        title: "Agenda hoy",
        fixed: true,
        cards: [
          ...myAgendaHoy.filter((a) => !a.completed).map(agendaToCard),
          ...myAgendaHoy.filter((a) => a.completed).map(agendaToCard),
        ],
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

  const assignableAgents = (todosAgentes ?? [])
    .filter((a) => {
      const isTargetAdmin = a.rol?.toLowerCase() === "administrador" || a.rol?.toLowerCase() === "admin";
      if (isTargetAdmin) {
        return role === "Administrador";
      }
      if (role === "Administrador" || role === "Director") return true;
      if (role === "Responsable") return a.id === userId || (yo?.supervisedAgentIds ?? []).includes(a.id);
      return a.id === userId;
    })
    .map((a) => ({ id: String(a.id), nombre: `${a.nombre} ${a.apellidos}`.trim() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <DashboardWorkspace
      role={role}
      userName={userName}
      currentUserId={userId}
      summary={summary}
      listings={listings}
      nextBestActions={nextBestActions}
      pipelineSuggestions={pipelineSuggestions}
      lostOpportunities={lostOpportunities}
      kanbanData={kanbanData}
      kanbanCols={(kanbanColsData ?? []).map((c: { col_id: string; titulo: string }) => ({ id: c.col_id, title: c.titulo }))}
      agentMetrics={agentMetrics}
      ownMetrics={ownMetrics}
      ordenDiaAgentes={ordenDiaAgentes}
      showOrdenDia={showOrdenDia}
      showAgentPerformance={showAgentPerformance}
      showMyActivity={showMyActivity}
      noticiasMap={noticiasMap}
      encargosMap={encargosMap}
      empresaId={yo?.empresaId ?? null}
      fullName={fullName}
      currentDateLabel={currentDateLabel}
      agenteMesData={agenteMesData}
      assignableAgents={assignableAgents}
      zonasGeograficas={zonasGeograficas}
    />
  );
}
