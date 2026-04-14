import PageHeader from "@/components/layout/page-header";
import { getConfirmationPasswordStatus } from "@/lib/delete-confirmation-password";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import SecuritySettingsForm from "./security-settings-form";

export default async function CuentaPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const [user, passwordStatus] = await Promise.all([
    getCurrentUserContext(),
    getConfirmationPasswordStatus(),
  ]);

  return (
    <>
      <PageHeader
        title="Cuenta"
        description="Perfil actual y seguridad de operaciones sensibles"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary">
            Usuario actual
          </h2>
          {user ? (
            <div className="mt-5 space-y-4">
              <InfoRow
                label="Nombre"
                value={`${user.nombre} ${user.apellidos}`.trim() || "-"}
              />
              <InfoRow label="Correo" value={user.email ?? authUser.email ?? "-"} />
              <InfoRow label="Rango" value={user.role} />
              <InfoRow label="Puesto actual" value={user.puesto || "-"} />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <InfoRow label="Correo" value={authUser.email ?? "-"} />
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium text-amber-800">
                  Tu cuenta de acceso no está vinculada a un perfil de usuario.
                  Contacta con el administrador para que asocie tu correo en la
                  tabla de usuarios.
                </p>
              </div>
            </div>
          )}
        </section>

        <SecuritySettingsForm
          currentRole={user?.role ?? "Agente"}
          canManageConfirmationPassword={user?.canManageConfirmationPassword ?? false}
          passwordStatus={passwordStatus}
        />
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
