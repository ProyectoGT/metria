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
  const supervisedIds = yo?.supervisedAgentIds ?? [];

  // ── Agenda query según rol ────────────────────────────────────────────────
  let eventsQuery;

  if (role === "Administrador" || role === "Director") {
    // RLS ya filtra por empresa — ven todos los eventos de su empresa
    eventsQuery = supabase
      .from("agenda")
      .select("*")
      .order("event_date", { ascending: true });
  } else if (role === "Responsable") {
    // Ven los suyos + los de sus agentes supervisados (incluyendo privados)
    const adminSupa = createAdminClient();
    const visibleIds = [userId, ...supervisedIds];
    eventsQuery = adminSupa
      .from("agenda")
      .select("*")
      .in("owner_user_id", visibleIds)
      .order("event_date", { ascending: true });
  } else {
    // Agente: solo los suyos
    eventsQuery = supabase
      .from("agenda")
      .select("*")
      .eq("owner_user_id", userId)
      .order("event_date", { ascending: true });
  }

  const [{ data: events }, { data: tareas }, { data: usersData }] = await Promise.all([
    eventsQuery,
    supabase
      .from("tareas")
      .select("id, titulo, prioridad, fecha, estado, owner_user_id")
      .not("fecha", "is", null)
      .order("fecha", { ascending: true })
      .returns<{ id: number; titulo: string; prioridad: string | null; fecha: string; estado: string | null; owner_user_id: number | null }[]>(),
    // Mapa de usuarios para mostrar nombre del propietario del evento
    supabase.from("usuarios").select("id, nombre, apellidos"),
  ]);

  // Filtrar tareas según rol
  const visibleTareaIds = new Set([userId, ...supervisedIds]);
  const filteredTareas = (tareas ?? []).filter((t) => {
    if (role === "Administrador" || role === "Director") return true;
    if (role === "Responsable") return t.owner_user_id != null && visibleTareaIds.has(t.owner_user_id);
    return t.owner_user_id === userId;
  });

  // Filtrar tareas según rol (tareas también respetan visibilidad)
  // (ya filtradas arriba en filteredTareas)

  // Mapa id → nombre completo
  const usersMap: Record<number, string> = {};
  for (const u of usersData ?? []) {
    usersMap[u.id] = `${u.nombre} ${u.apellidos}`.trim();
  }

  // Lista de usuarios filtrables según rol
  const filterableUsers = (usersData ?? [])
    .filter((u) => {
      if (role === "Administrador" || role === "Director") return true;
      if (role === "Responsable") return u.id === userId || supervisedIds.includes(u.id);
      return false;
    })
    .map((u) => ({ id: u.id, name: `${u.nombre} ${u.apellidos}`.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <CalendarioClient
        initialEvents={(events ?? []) as unknown as Parameters<typeof CalendarioClient>[0]["initialEvents"]}
        initialTareas={filteredTareas}
        isConnected={isConnected}
        role={role}
        currentUserId={userId}
        usersMap={usersMap}
        filterableUsers={filterableUsers}
      />
    </>
  );
}
