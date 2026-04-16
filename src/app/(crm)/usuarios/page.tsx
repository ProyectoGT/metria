import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/page-header";
import { getCurrentUserContext } from "@/lib/current-user";
import { canManageUsers, USER_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase";
import UsersManagementPanel from "./users-management-panel";

export default async function UsuariosPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    redirect("/login");
  }

  if (!canManageUsers(currentUser.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const usersQuery = supabase
    .from("usuarios")
    .select("id, nombre, apellidos, correo, rol, estado, auth_id")
    .order("rol")
    .order("nombre")
    .order("apellidos");

  const { data: usersData, error } =
    currentUser.empresaId !== null
      ? await usersQuery.eq("empresa_id", currentUser.empresaId)
      : await usersQuery;

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
  }));

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Gestion de accesos y rangos del equipo."
      />
      <UsersManagementPanel users={users} roles={USER_ROLES} />
    </>
  );
}
