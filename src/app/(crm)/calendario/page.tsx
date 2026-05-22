import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { requirePageAccess } from "@/lib/access-control/route-guard";
import CalendarioClient from "./calendario-client";

const AGENDA_SELECT = "id, description, event_date, time, priority, completed, result, gcal_event_id, user_id, created_at, owner_user_id, empresa_id, equipo_id, visibility, tipo, archived_at, archived_reason, converted_to_tarea_id, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))";

export default async function CalendarioPage() {
  const cookieStore = await cookies();
  const isConnected = !!(
    cookieStore.get("google_access_token")?.value ||
    cookieStore.get("google_refresh_token")?.value
  );

  const supabase = await createClient();
  const yo = await requirePageAccess("calendario");
  const userId = yo.id;
  const role = yo.role;
  const empresaId = yo.empresaId ?? null;
  const supervisedIds = yo.supervisedAgentIds ?? [];

  const _today = new Date();
  const calendarRange = {
    from: new Date(_today.getFullYear(), _today.getMonth() - 6, 1).toISOString().slice(0, 10),
    to: new Date(_today.getFullYear(), _today.getMonth() + 13, 0).toISOString().slice(0, 10),
  };

  let eventsQuery;

  if (role === "Administrador" || role === "Director") {
    // Admin/Director usan admin client para leer todos los eventos de la empresa
    // en una sola query sin restricciones de RLS por usuario individual.
    // La segunda capa de seguridad es el eq("empresa_id") explícito.
    const adminSupa = createAdminClient();
    eventsQuery = adminSupa
      .from("agenda")
      .select(AGENDA_SELECT)
      .is("archived_at", null)
      .order("event_date", { ascending: true });
    if (empresaId !== null) eventsQuery = eventsQuery.eq("empresa_id", empresaId);
  } else if (role === "Responsable") {
    // Responsable usa el cliente de usuario con RLS.
    // La migración 20260514000003 restauró la cláusula de supervisados en la
    // policy agenda_select_safe_no_recursion usando get_supervised_user_ids()
    // (SECURITY DEFINER, sin recursión). RLS devuelve: eventos propios +
    // eventos de supervisados + visibilidad company/team.
    // NO usar createAdminClient() aquí: la RLS ya hace el filtrado correcto
    // y así el server y el hook del cliente devuelven el mismo conjunto.
    eventsQuery = supabase
      .from("agenda")
      .select(AGENDA_SELECT)
      .is("archived_at", null)
      .eq("empresa_id", empresaId ?? -1)
      .order("event_date", { ascending: true });
  } else {
    // Agente: admin client con filtro de empresa. El filtro JS posterior
    // restringe al propio agente (solo sus eventos asignados/propios).
    // Nota: esto es más restrictivo que RLS pura (que incluiría company/team
    // visibility). Cambio pendiente cuando se unifique con el hook.
    const agenteSupa = createAdminClient();
    eventsQuery = agenteSupa
      .from("agenda")
      .select("*, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .order("event_date", { ascending: true });
    if (empresaId !== null) eventsQuery = eventsQuery.eq("empresa_id", empresaId);
  }

  const [{ data: events }, { data: usersData }, { data: archivedGoogleEvents }] = await Promise.all([
    eventsQuery,
    supabase.from("usuarios").select("id, nombre, apellidos, rol"),
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
  // Responsable: RLS ya filtra correctamente (ver migración 20260514000003).
  // Agente: el admin client devuelve todos los eventos de la empresa;
  //   el filtro JS restringe al agente para evitar ver eventos ajenos.
  // Admin/Director: sin filtro JS, RLS+empresa_id es suficiente.
  const visibleEvents = role === "Agente"
    ? ((events ?? []) as unknown as EventWithAssignments[]).filter((event) => {
        const assigned = event.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
        return assigned.includes(userId) || event.owner_user_id === userId || event.user_id === userId;
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
      const isTargetAdmin = u.rol?.toLowerCase() === "administrador" || u.rol?.toLowerCase() === "admin";
      if (isTargetAdmin) {
        return role === "Administrador";
      }
      if (role === "Administrador" || role === "Director") return true;
      if (role === "Responsable") return u.id === userId || supervisedIds.includes(u.id);
      return u.id === userId;
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
      supervisedIds={supervisedIds}
      usersMap={usersMap}
      filterableUsers={filterableUsers}
      archivedGoogleEventIds={(archivedGoogleEvents ?? [])
        .map((event) => event.gcal_event_id)
        .filter((id): id is string => Boolean(id))}
    />
  );
}
