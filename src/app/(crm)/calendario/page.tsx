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

  let eventsQuery;

  if (role === "Administrador" || role === "Director") {
    eventsQuery = supabase
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
    eventsQuery = supabase
      .from("agenda")
      .select("*, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
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
      .eq("owner_user_id", userId),
  ]);

  type EventWithAssignments = {
    owner_user_id: number | null;
    user_id?: number | null;
    event_date?: string | null;
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
      usersMap={usersMap}
      filterableUsers={filterableUsers}
      archivedGoogleEventIds={(archivedGoogleEvents ?? [])
        .map((event) => event.gcal_event_id)
        .filter((id): id is string => Boolean(id))}
    />
  );
}
