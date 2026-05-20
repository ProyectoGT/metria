import { createClient } from "@/lib/supabase";
import type { CurrentUserContext } from "@/lib/current-user";
import { calculatePropertyMatches, type MatchPedido, type MatchPropiedad } from "@/modules/matching/services";

export type NextBestActionPriority = "alta" | "media" | "baja";

export type NextBestActionType =
  | "pedido_sin_seguimiento"
  | "propiedad_sin_actividad"
  | "match_alto"
  | "tarea_vencida"
  | "agenda_vencida"
  | "oportunidad_perdida";

export type NextBestActionEntity = {
  type: "pedido" | "propiedad" | "tarea" | "agenda";
  id: number;
  label: string;
  pedidoId?: number | null;
  propiedadId?: number | null;
};

export type NextBestAction = {
  id: string;
  tipo: NextBestActionType;
  titulo: string;
  descripcion: string;
  prioridad: NextBestActionPriority;
  entidad: NextBestActionEntity;
  actionUrl: string;
  reason: string;
};

type PedidoRow = MatchPedido & {
  owner_user_id: number | null;
  created_at?: string | null;
};

type PropiedadRow = MatchPropiedad & {
  agente_asignado: number | null;
  owner_user_id: number | null;
  created_at: string | null;
};

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function propLabel(propiedad: MatchPropiedad) {
  if (propiedad.propietario?.trim()) return propiedad.propietario.trim();
  const parts = [propiedad.planta && `Planta ${propiedad.planta}`, propiedad.puerta && `Puerta ${propiedad.puerta}`].filter(Boolean);
  return parts.length ? parts.join(" ") : `Propiedad #${propiedad.id}`;
}

function pedidoLabel(pedido: MatchPedido) {
  return pedido.nombre_cliente?.trim() || `Pedido #${pedido.id}`;
}

function priorityByAge(days: number): NextBestActionPriority {
  if (days >= 14) return "alta";
  if (days >= 7) return "media";
  return "baja";
}

function allowedUserIds(user: CurrentUserContext) {
  if (user.role === "Administrador" || user.role === "Director") return null;
  if (user.role === "Responsable") return [user.id, ...user.supervisedAgentIds];
  return [user.id];
}

function actionRank(action: NextBestAction) {
  const priority = action.prioridad === "alta" ? 0 : action.prioridad === "media" ? 1 : 2;
  const typeBoost = action.tipo === "match_alto" ? 0 : action.tipo === "tarea_vencida" ? 1 : 2;
  return priority * 10 + typeBoost;
}

export async function getNextBestActions(user: CurrentUserContext | null): Promise<NextBestAction[]> {
  if (!user) return [];

  const supabase = await createClient();
  const allowedIds = allowedUserIds(user);
  const now = new Date();
  const actions: NextBestAction[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pedidosQuery = (supabase as any)
    .from("pedidos")
    .select("id,nombre_cliente,tipo_propiedad,zona_busqueda,presupuesto,modalidad,habitaciones,banos,garaje,altura_deseada,notas,owner_user_id")
    .order("id", { ascending: false })
    .limit(80);
  if (allowedIds) pedidosQuery = pedidosQuery.in("owner_user_id", allowedIds.length ? allowedIds : [-1]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let propiedadesQuery = (supabase as any)
    .from("propiedades")
    .select("id,planta,puerta,propietario,estado,notas,honorarios,finca_id,agente_asignado,owner_user_id,created_at,fincas(id,numero,sectores(id,numero,zona_id,zona(id,nombre)))")
    .not("estado", "ilike", "vendid%")
    .order("id", { ascending: false })
    .limit(150);
  if (allowedIds) propiedadesQuery = propiedadesQuery.in("agente_asignado", allowedIds.length ? allowedIds : [-1]);

  const [{ data: pedidosData }, { data: propiedadesData }, { data: tareasData }, { data: agendaData }] = await Promise.all([
    pedidosQuery,
    propiedadesQuery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("tareas")
      .select("id,titulo,prioridad,fecha,estado,owner_user_id")
      .is("archived_at", null)
      .not("fecha", "is", null)
      .lt("fecha", now.toISOString())
      .neq("estado", "completado")
      .limit(30),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("agenda")
      .select("id,description,event_date,time,priority,completed,owner_user_id")
      .is("archived_at", null)
      .lt("event_date", now.toISOString().slice(0, 10))
      .eq("completed", false)
      .limit(30),
  ]);

  const pedidos = (pedidosData ?? []) as PedidoRow[];
  const propiedades = (propiedadesData ?? []) as PropiedadRow[];

  const pedidoIds = pedidos.map((p) => p.id);
  const propiedadIds = propiedades.map((p) => p.id);

  const [{ data: pedidoTimeline }, { data: propiedadTimeline }] = await Promise.all([
    pedidoIds.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("contacto_timeline_events")
          .select("pedido_id,created_at")
          .in("pedido_id", pedidoIds)
      : Promise.resolve({ data: [] }),
    propiedadIds.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("contacto_timeline_events")
          .select("propiedad_id,created_at")
          .in("propiedad_id", propiedadIds)
      : Promise.resolve({ data: [] }),
  ]);

  const lastPedidoActivity = new Map<number, number>();
  for (const event of (pedidoTimeline ?? []) as Array<{ pedido_id: number | null; created_at: string }>) {
    if (event.pedido_id) lastPedidoActivity.set(event.pedido_id, Math.max(lastPedidoActivity.get(event.pedido_id) ?? 0, toTime(event.created_at)));
  }

  const lastPropiedadActivity = new Map<number, number>();
  for (const event of (propiedadTimeline ?? []) as Array<{ propiedad_id: number | null; created_at: string }>) {
    if (event.propiedad_id) lastPropiedadActivity.set(event.propiedad_id, Math.max(lastPropiedadActivity.get(event.propiedad_id) ?? 0, toTime(event.created_at)));
  }

  for (const tarea of (tareasData ?? []) as Array<{ id: number; titulo: string; prioridad: string | null; fecha: string | null }>) {
    actions.push({
      id: `tarea-vencida-${tarea.id}`,
      tipo: "tarea_vencida",
      titulo: `Completar tarea vencida: ${tarea.titulo}`,
      descripcion: "Hay una tarea pendiente con fecha vencida.",
      prioridad: tarea.prioridad === "alta" ? "alta" : "media",
      entidad: { type: "tarea", id: tarea.id, label: tarea.titulo },
      actionUrl: "/dashboard",
      reason: "Las tareas vencidas bloquean el seguimiento comercial.",
    });
  }

  for (const agenda of (agendaData ?? []) as Array<{ id: number; description: string; event_date: string }>) {
    actions.push({
      id: `agenda-vencida-${agenda.id}`,
      tipo: "agenda_vencida",
      titulo: `Cerrar actividad vencida: ${agenda.description}`,
      descripcion: `Actividad del ${agenda.event_date} sin completar.`,
      prioridad: "media",
      entidad: { type: "agenda", id: agenda.id, label: agenda.description },
      actionUrl: "/ordenes",
      reason: "Una actividad sin resultado reduce la trazabilidad del cliente.",
    });
  }

  for (const pedido of pedidos.slice(0, 40)) {
    const last = lastPedidoActivity.get(pedido.id) ?? 0;
    const staleDays = last ? Math.floor((now.getTime() - last) / 86400000) : 30;
    if (!last || last < daysAgo(10).getTime()) {
      actions.push({
        id: `pedido-seguimiento-${pedido.id}`,
        tipo: "pedido_sin_seguimiento",
        titulo: `Llamar a ${pedidoLabel(pedido)}`,
        descripcion: "Pedido sin seguimiento reciente registrado en timeline.",
        prioridad: priorityByAge(staleDays),
        entidad: { type: "pedido", id: pedido.id, label: pedidoLabel(pedido), pedidoId: pedido.id },
        actionUrl: "/solicitudes",
        reason: last ? `${staleDays} dias sin actividad registrada.` : "No consta actividad de seguimiento.",
      });
    }
  }

  for (const propiedad of propiedades.slice(0, 60)) {
    const last = Math.max(lastPropiedadActivity.get(propiedad.id) ?? 0, toTime(propiedad.created_at));
    const staleDays = last ? Math.floor((now.getTime() - last) / 86400000) : 7;
    if (last < daysAgo(7).getTime()) {
      actions.push({
        id: `propiedad-actividad-${propiedad.id}`,
        tipo: "propiedad_sin_actividad",
        titulo: `Revisar ${propLabel(propiedad)}`,
        descripcion: "Propiedad disponible sin actividad reciente.",
        prioridad: priorityByAge(staleDays),
        entidad: { type: "propiedad", id: propiedad.id, label: propLabel(propiedad), propiedadId: propiedad.id },
        actionUrl: "/zona",
        reason: `${staleDays} dias sin actividad registrada.`,
      });
    }
  }

  for (const pedido of pedidos.slice(0, 20)) {
    const [match] = calculatePropertyMatches(pedido, propiedades, { minScore: 70, limit: 1 });
    if (match) {
      actions.push({
        id: `match-alto-${pedido.id}-${match.propiedad.id}`,
        tipo: "match_alto",
        titulo: `Contactar a ${pedidoLabel(pedido)} por match alto`,
        descripcion: `${propLabel(match.propiedad)} tiene score ${match.score}.`,
        prioridad: match.score >= 85 ? "alta" : "media",
        entidad: {
          type: "pedido",
          id: pedido.id,
          label: pedidoLabel(pedido),
          pedidoId: pedido.id,
          propiedadId: match.propiedad.id,
        },
        actionUrl: "/solicitudes",
        reason: match.razones.join("; "),
      });
    }
  }

  return actions
    .sort((a, b) => actionRank(a) - actionRank(b) || a.id.localeCompare(b.id))
    .slice(0, 8);
}
