import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import CalendarioClient from "./calendario-client";

const AGENDA_SELECT = "id, description, event_date, time, priority, completed, result, gcal_event_id, user_id, created_at, owner_user_id, empresa_id, equipo_id, visibility, tipo, archived_at, archived_reason, converted_to_tarea_id, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))";

function calendarRangeAroundToday() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 6, 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 13, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default async function CalendarioPage() {
  const cookieStore = await cookies();
  const isConnected = !!(
    cookieStore.get("google_access_token")?.value ||
    cookieStore.get("google_refresh_token")?.value
  );

  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  const userId = yo?.id ?? 0;
  const role = yo?.role ?? "Agente";
  const empresaId = yo?.empresaId ?? null;
  const supervisedIds = yo?.supervisedAgentIds ?? [];
  const calendarRange = calendarRangeAroundToday();

  let eventsQuery;

  if (role === "Administrador" || role === "Director") {
    const adminSupa = createAdminClient();
    eventsQuery = adminSupa
      .from("agenda")
      .select(AGENDA_SELECT)
      .is("archived_at", null)
      .gte("event_date", calendarRange.from)
      .lte("event_date", calendarRange.to)
      .order("event_date", { ascending: true });
    if (empresaId !== null) eventsQuery = eventsQuery.eq("empresa_id", empresaId);
  } else if (role === "Responsable") {
    const adminSupa = createAdminClient();
    eventsQuery = adminSupa
      .from("agenda")
      .select(AGENDA_SELECT)
      .is("archived_at", null)
      .eq("empresa_id", empresaId ?? -1)
      .gte("event_date", calendarRange.from)
      .lte("event_date", calendarRange.to)
      .order("event_date", { ascending: true });
  } else {
    // Agente: usar admin client con filtro explícito para garantizar visibilidad
    // propia sin depender del RLS. El filtro JS posterior restringe al usuario.
    const agenteSupa = createAdminClient();
    eventsQuery = agenteSupa
      .from("agenda")
      .select(AGENDA_SELECT)
      .is("archived_at", null)
      .gte("event_date", calendarRange.from)
      .lte("event_date", calendarRange.to)
      .order("event_date", { ascending: true });
    if (empresaId !== null) eventsQuery = eventsQuery.eq("empresa_id", empresaId);
  }

  const [{ data: events }, { data: usersData }, { data: archivedGoogleEvents }] = await Promise.all([
    eventsQuery,
    supabase.from("usuarios").select("id, nombre, apellidos"),
    supabase
      .from("agenda")
      .select("gcal_event_id")
      .not("archived_at", "is", null)
      .not("gcal_event_id", "is", null)
      .gte("event_date", calendarRange.from)
      .lte("event_date", calendarRange.to)
      .eq("owner_user_id", userId),
  ]);

  type EventWithAssignments = {
    id: number;
    description?: string | null;
    owner_user_id: number | null;
    user_id?: number | null;
    event_date?: string | null;
    time?: string | null;
    tipo?: string | null;
    gcal_event_id?: string | null;
    created_at?: string | null;
    agenda_usuarios?: { usuario_id: number }[];
  };
  const visibleIds = [userId, ...supervisedIds];
  const visibleEvents = role === "Responsable"
    ? ((events ?? []) as unknown as EventWithAssignments[]).filter((event) => {
        const assigned = event.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
        return assigned.some((id) => visibleIds.includes(id))
          || (event.owner_user_id != null && visibleIds.includes(event.owner_user_id))
          || (event.user_id != null && visibleIds.includes(event.user_id));
      })
    : role === "Agente"
      ? ((events ?? []) as unknown as EventWithAssignments[]).filter((event) => {
          const assigned = event.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
          return assigned.includes(userId) || event.owner_user_id === userId || event.user_id === userId;
        })
    : (events ?? []);

  if (process.env.NODE_ENV !== "production") {
    const rows = (events ?? []) as unknown as EventWithAssignments[];
    const visibleRows = visibleEvents as EventWithAssignments[];
    console.debug("[agenda:calendario]", {
      userId,
      empresaId,
      role,
      totalRows: rows.length,
      visibleRows: visibleRows.length,
      discardedRows: rows.length - visibleRows.length,
      withoutEventDate: rows.filter((event) => !event.event_date).length,
    });
    console.log("[calendario:server] initialEvents", {
      count: visibleEvents.length,
      ids: visibleEvents.map((event) => event.id),
      rows: visibleEvents.slice(0, 10).map((event) => ({
        id: event.id,
        description: event.description,
        event_date: event.event_date,
        time: event.time,
        tipo: event.tipo,
        user_id: event.user_id,
        owner_user_id: event.owner_user_id,
        gcal_event_id: event.gcal_event_id,
      })),
    });
  }

  const usersMap: Record<number, string> = {};
  for (const u of usersData ?? []) {
    usersMap[u.id] = `${u.nombre} ${u.apellidos}`.trim();
  }

  const filterableUsers = (usersData ?? [])
    .filter((u) => {
      if (role === "Administrador" || role === "Director") return true;
      if (role === "Responsable") return u.id === userId || supervisedIds.includes(u.id);
      return false;
    })
    .map((u) => ({ id: u.id, name: `${u.nombre} ${u.apellidos}`.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <CalendarioClient
      initialEvents={visibleEvents as unknown as Parameters<typeof CalendarioClient>[0]["initialEvents"]}
      initialTareas={[]}
      isConnected={isConnected}
      role={role}
      currentUserId={userId}
      empresaId={empresaId}
      usersMap={usersMap}
      filterableUsers={filterableUsers}
      archivedGoogleEventIds={(archivedGoogleEvents ?? [])
        .map((event) => event.gcal_event_id)
        .filter((id): id is string => Boolean(id))}
    />
  );
}
