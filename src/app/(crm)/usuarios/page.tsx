import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/page-header";
import { getCurrentUserContext } from "@/lib/current-user";
import { canManageUsers, USER_ROLES } from "@/lib/roles";
import CreateUserForm from "./create-user-form";

export default async function UsuariosPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    redirect("/login");
  }

  if (!canManageUsers(currentUser.role)) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Crea cuentas de acceso nuevas y asignales un perfil dentro del CRM."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <CreateUserForm roles={USER_ROLES} />

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary">
            Roles disponibles
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Los roles permitidos actualmente en la base de datos son los
            siguientes:
          </p>

          <div className="mt-5 grid gap-3">
            {USER_ROLES.map((role) => (
              <div
                key={role}
                className="rounded-xl border border-border/80 bg-background px-4 py-3"
              >
                <p className="text-sm font-medium text-text-primary">{role}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              El usuario se crea con contrasena inmediata y estado activo. Si
              ya existe un perfil previo con el mismo correo, esta pantalla lo
              vinculara a la nueva cuenta de acceso.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
