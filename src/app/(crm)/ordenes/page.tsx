import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { canViewAllAgents, canViewSupervisedAgents } from "@/lib/roles";
import PageHeader from "@/components/layout/page-header";
import OrdenesClient from "./ordenes-client";

export default async function OrdenesPage() {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();

  if (!yo) {
    return <div className="p-6 text-text-secondary">No autenticado.</div>;
  }

  const today = new Date().toISOString().split("T")[0];

  let allowedUserIds: number[] | null = null;

  if (canViewAllAgents(yo.role)) {
    allowedUserIds = null;
  } else if (canViewSupervisedAgents(yo.role)) {
    allowedUserIds = [yo.id, ...yo.supervisedAgentIds];
  } else {
    allowedUserIds = [yo.id];
  }

  // Mover tareas de dias pasados no completadas a pendientes (sin fecha)
  {
    let q = supabase
      .from("tareas")
      .update({ fecha: null })
      .lt("fecha", today)
      .neq("estado", "completado");
    if (allowedUserIds !== null) q = q.in("owner_user_id", allowedUserIds);
    await q;
  }

  // Eliminar tareas de dias pasados ya completadas
  {
    let q = supabase
      .from("tareas")
      .delete()
      .lt("fecha", today)
      .eq("estado", "completado");
    if (allowedUserIds !== null) q = q.in("owner_user_id", allowedUserIds);
    await q;
  }

  // Obtener tareas de hoy + pendientes (sin fecha)
  // Usamos rango completo del dia para capturar timestamps con hora (ej: 2026-04-23T20:00:00)
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  let tareasQuery = supabase
    .from("tareas")
    .select("*")
    .or(`fecha.is.null,and(fecha.gte.${today}T00:00:00,fecha.lt.${tomorrowStr}T00:00:00)`)
    .order("id", { ascending: false });

  if (allowedUserIds !== null) {
    tareasQuery = tareasQuery.in("owner_user_id", allowedUserIds);
  }

  const { data: tareas } = await tareasQuery;

  let usuariosQuery = supabase
    .from("usuarios")
    .select("id, nombre, apellidos")
    .order("nombre");

  if (allowedUserIds !== null) {
    usuariosQuery = usuariosQuery.in("id", allowedUserIds);
  }

  const { data: usuarios } = await usuariosQuery;

  const fechaHoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <PageHeader
        title="Orden del dia"
        description={`Tareas de hoy — ${fechaHoy}`}
      />
      <OrdenesClient
        initialTareas={tareas ?? []}
        currentUserId={yo.id}
        currentUserRole={yo.role}
        usuarios={usuarios ?? []}
        today={today}
      />
    </>
  );
}
