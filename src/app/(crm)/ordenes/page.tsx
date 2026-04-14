import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { canViewAllAgents, canViewSupervisedAgents } from "@/lib/roles";
import PageHeader from "@/components/layout/page-header";
import OrdenesClient from "./ordenes-client";

export default async function OrdenesPage() {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();

  if (!yo) {
    return (
      <div className="p-6 text-text-secondary">No autenticado.</div>
    );
  }

  // ── Determinar qué user IDs puede ver este usuario ──────────────────
  let allowedUserIds: number[] | null = null; // null = todos (Admin/Director)

  if (canViewAllAgents(yo.role)) {
    allowedUserIds = null; // sin filtro
  } else if (canViewSupervisedAgents(yo.role)) {
    // Responsable: sus propias tareas + las de sus supervisados
    allowedUserIds = [yo.id, ...yo.supervisedAgentIds];
  } else {
    // Agente: solo las suyas
    allowedUserIds = [yo.id];
  }

  // ── Query de tareas ─────────────────────────────────────────────────
  let tareasQuery = supabase
    .from("tareas")
    .select("*")
    .order("fecha", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false });

  if (allowedUserIds !== null) {
    tareasQuery = tareasQuery.in("owner_user_id", allowedUserIds);
  }

  const { data: tareas } = await tareasQuery;

  // ── Query de usuarios visibles (para mostrar nombre y crear tareas para ellos) ─
  let usuariosQuery = supabase
    .from("usuarios")
    .select("id, nombre, apellidos")
    .order("nombre");

  if (allowedUserIds !== null) {
    usuariosQuery = usuariosQuery.in("id", allowedUserIds);
  }

  const { data: usuarios } = await usuariosQuery;

  return (
    <>
      <PageHeader
        title="Órdenes del día"
        description="Gestiona las tareas diarias"
      />
      <OrdenesClient
        initialTareas={tareas ?? []}
        currentUserId={yo.id}
        currentUserRole={yo.role}
        usuarios={usuarios ?? []}
      />
    </>
  );
}
