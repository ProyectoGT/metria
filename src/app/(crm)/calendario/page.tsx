import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
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
  const supervisedIds = yo?.supervisedAgentIds ?? [];

  let eventsQuery;

  if (role === "Administrador" || role === "Director") {
    eventsQuery = supabase
      .from("agenda")
      .select("*, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .order("event_date", { ascending: true });
  } else if (role === "Responsable") {
    // La política agenda_select_scoped (migración 20260503000009) ya incluye
    // a los agentes supervisados del Responsable, por lo que createClient() es suficiente.
    eventsQuery = supabase
      .from("agenda")
      .select("*, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .order("event_date", { ascending: true });
  } else {
    eventsQuery = supabase
      .from("agenda")
      .select("*, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .eq("owner_user_id", userId)
      .order("event_date", { ascending: true });
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
    agenda_usuarios?: { usuario_id: number }[];
  };
  const visibleIds = [userId, ...supervisedIds];
  const visibleEvents = role === "Responsable"
    ? ((events ?? []) as unknown as EventWithAssignments[]).filter((event) => {
        const assigned = event.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
        return assigned.some((id) => visibleIds.includes(id)) || (
          event.owner_user_id != null && visibleIds.includes(event.owner_user_id)
        );
      })
    : (events ?? []);

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
