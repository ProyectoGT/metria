import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/page-header";
import { getCurrentUserContext } from "@/lib/current-user";
import { canManageUsers, canCreateUsers, USER_ROLES } from "@/lib/roles";
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
      <PageHeader
        title="Usuarios"
        description="Gestion de accesos y rangos del equipo."
      />
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
