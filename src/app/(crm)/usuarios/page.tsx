import { redirect } from "next/navigation";
import Link from "next/link";
import { Network } from "lucide-react";
import { getCurrentUserContext } from "@/lib/current-user";
import { canCreateUsers, USER_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase";
import UsersManagementPanel from "./users-management-panel";

export default async function UsuariosPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    redirect("/login");
  }

  if (!canCreateUsers(currentUser.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const baseQuery = currentUser.empresaId !== null
    ? supabase.from("usuarios").select("id, nombre, apellidos, correo, rol, estado, auth_id, supervisor_id").eq("empresa_id", currentUser.empresaId)
    : supabase.from("usuarios").select("id, nombre, apellidos, correo, rol, estado, auth_id, supervisor_id");

  const { data: usersData, error } = await baseQuery.order("rol").order("nombre").order("apellidos");

  if (error) {
    throw new Error(error.message);
  }

  const users = (usersData ?? []).map((user) => ({
    id: user.id,
    nombre: user.nombre,
    apellidos: user.apellidos,
    correo: user.correo,
    rol: user.rol,
    estado: user.estado,
    authId: user.auth_id,
    supervisorId: user.supervisor_id ?? null,
  }));

  const supervisors = users
    .filter((u) => u.rol === "Director" || u.rol === "Responsable")
    .map((u) => ({ id: u.id, nombre: u.nombre, apellidos: u.apellidos, rol: u.rol }));

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4 md:mb-8">
        <div>
          <h1 className="text-xl font-semibold text-text-primary md:text-2xl">Usuarios</h1>
          <p className="mt-1 text-sm text-text-secondary">Gestion de accesos y rangos del equipo.</p>
        </div>
        <Link
          href="/empresa/organigrama"
          className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Network className="h-4 w-4" />
          Ver organigrama
        </Link>
      </div>
      <UsersManagementPanel
        users={users}
        roles={USER_ROLES}
        supervisors={supervisors}
        currentUserRole={currentUser.role}
        currentUserId={currentUser.id}
      />
    </>
  );
}
