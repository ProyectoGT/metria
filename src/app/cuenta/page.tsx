import Header from "@/components/layout/header";
import { getConfirmationPasswordStatus } from "@/lib/delete-confirmation-password";
import { getCurrentUserContext } from "@/lib/current-user";
import SecuritySettingsForm from "./security-settings-form";

export default async function CuentaPage() {
  const [user, passwordStatus] = await Promise.all([
    getCurrentUserContext(),
    getConfirmationPasswordStatus(),
  ]);

  if (!user) {
    return null;
  }

  return (
    <>
      <Header
        title="Cuenta"
        description="Perfil actual y seguridad de operaciones sensibles"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary">
            Usuario actual
          </h2>
          <div className="mt-5 space-y-4">
            <InfoRow
              label="Nombre"
              value={`${user.nombre} ${user.apellidos}`.trim()}
            />
            <InfoRow label="Correo" value={user.email ?? "-"} />
            <InfoRow label="Rango" value={user.role} />
            <InfoRow label="Puesto actual" value={user.puesto || "-"} />
          </div>
        </section>

        <SecuritySettingsForm
          currentRole={user.role}
          canManageConfirmationPassword={user.canManageConfirmationPassword}
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
