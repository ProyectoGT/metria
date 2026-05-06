import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import CalendarioClient from "./calendario-client";

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

  // ── Agenda events: siempre admin client para bypasear RLS ─────────────────
  let eventsQuery;

  if (role === "Administrador" || role === "Director") {
    const adminSupa = createAdminClient();
    eventsQuery = adminSupa
      .from("agenda")
      .select("*, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .order("event_date", { ascending: true });
    if (empresaId !== null) eventsQuery = eventsQuery.eq("empresa_id", empresaId);
  } else if (role === "Responsable") {
    const adminSupa = createAdminClient();
    eventsQuery = adminSupa
      .from("agenda")
      .select("*, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .eq("empresa_id", empresaId ?? -1)
      .order("event_date", { ascending: true });
  } else {
    // Agente: usar admin client con filtro explícito para garantizar visibilidad
    // propia sin depender del RLS. El filtro JS posterior restringe al usuario.
    const agenteSupa = createAdminClient();
    eventsQuery = agenteSupa
      .from("agenda")
      .select("*, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .order("event_date", { ascending: true });
    if (empresaId !== null) eventsQuery = eventsQuery.eq("empresa_id", empresaId);
  }

  // ── Tareas con fecha (para mostrar en el calendario) ──────────────────────
  const adminSupa = createAdminClient();
  const tareasQuery = adminSupa
    .from("tareas")
    .select("id, titulo, prioridad, fecha, estado, owner_user_id, tarea_usuarios(usuario_id)")
    .is("archived_at", null)
    .not("fecha", "is", null)
    .in("estado", ["pendiente", "completado"])
    .order("fecha", { ascending: true });

  const [{ data: events }, { data: usersData }, { data: archivedGoogleEvents }, { data: tareasData }] = await Promise.all([
    eventsQuery,
    supabase.from("usuarios").select("id, nombre, apellidos"),
    supabase
      .from("agenda")
      .select("gcal_event_id")
      .not("archived_at", "is", null)
      .not("gcal_event_id", "is", null)
      .eq("owner_user_id", userId),
    tareasQuery,
  ]);

  // ── Filtro JS según rol (ya que usamos admin client) ──────────────────────
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

  // ── Filtrar tareas según rol ──────────────────────────────────────────────
  type TareaRow = {
    id: number;
    titulo: string;
    prioridad: string | null;
    fecha: string;
    estado: string | null;
    owner_user_id: number | null;
    tarea_usuarios?: { usuario_id: number }[];
  };
  const allTareas = (tareasData ?? []) as unknown as TareaRow[];
  const visibleTareas = allTareas.filter((t) => {
    if (role === "Administrador" || role === "Director") return true;
    const assigned = t.tarea_usuarios?.map((u) => u.usuario_id) ?? [];
    if (role === "Responsable") {
      return assigned.some((id) => visibleIds.includes(id)) || visibleIds.includes(t.owner_user_id ?? -1);
    }
    return assigned.includes(userId) || t.owner_user_id === userId;
  });

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
      tareasCount: visibleTareas.length,
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
      initialTareas={visibleTareas}
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
