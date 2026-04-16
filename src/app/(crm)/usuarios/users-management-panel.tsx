"use client";

import { useState, useTransition } from "react";
import { deleteUserAction, updateUserRoleAction } from "./actions";

type ManagedUser = {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  estado: string;
  authId: string | null;
};

type Props = {
  users: ManagedUser[];
  roles: readonly string[];
};

export default function UsersManagementPanel({ users, roles }: Props) {
  const admins = users.filter((user) => user.rol === "Administrador").length;

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Panel de usuarios
          </h2>
          <p className="text-sm text-text-secondary">
            Los administradores aparecen solo como referencia. El resto de
            usuarios se puede gestionar desde esta tabla.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PanelBadge label={`${users.length} usuarios`} tone="neutral" />
          <PanelBadge label={`${admins} administradores`} tone="dark" />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="pb-3 pr-4 font-medium">Usuario</th>
              <th className="pb-3 pr-4 font-medium">Correo</th>
              <th className="pb-3 pr-4 font-medium">Estado</th>
              <th className="pb-3 pr-4 font-medium">Rango</th>
              <th className="pb-3 font-medium">Gestion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {users.map((user) => (
              <UserRow key={user.id} user={user} roles={roles} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserRow({
  user,
  roles,
}: {
  user: ManagedUser;
  roles: readonly string[];
}) {
  const [currentRole, setCurrentRole] = useState(user.rol);
  const [selectedRole, setSelectedRole] = useState(user.rol);
  const [currentStatus, setCurrentStatus] = useState(user.estado);
  const [removed, setRemoved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (removed) {
    return null;
  }

  const isAdmin = currentRole === "Administrador";
  const hasAccess = Boolean(user.authId) && currentStatus !== "disabled";

  function handleRoleSave() {
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const result = await updateUserRoleAction({
        userId: user.id,
        rol: selectedRole,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.role) {
        setCurrentRole(result.role);
        setSelectedRole(result.role);
      }

      setFeedback(result.message ?? "Rango actualizado.");
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Vas a eliminar o desactivar el acceso de ${user.nombre} ${user.apellidos}. Esta accion no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const result = await deleteUserAction({ userId: user.id });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.removed) {
        setRemoved(true);
        return;
      }

      if (result.status) {
        setCurrentStatus(result.status);
      }

      setFeedback(result.message ?? "Usuario actualizado.");
    });
  }

  return (
    <tr className={isAdmin ? "bg-muted/70 align-top" : "align-top"}>
      <td className="py-4 pr-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-primary">
            {`${user.nombre} ${user.apellidos}`.trim()}
          </p>
          <p className="text-xs text-text-secondary">{user.rol}</p>
        </div>
      </td>

      <td className="py-4 pr-4">
        <div className="space-y-1">
          <p className="text-sm text-text-primary">{user.correo}</p>
          <p className="text-xs text-text-secondary">
            {hasAccess ? "Acceso activo" : "Sin acceso vinculado"}
          </p>
        </div>
      </td>

      <td className="py-4 pr-4">
        <StatusBadge status={currentStatus} />
      </td>

      <td className="py-4 pr-4">
        <RoleBadge role={currentRole} />
      </td>

      <td className="py-4">
        {isAdmin ? (
          <p className="text-xs text-text-secondary">
            Usuario protegido. Solo visible en el listado.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex min-w-[220px] items-center gap-2">
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                disabled={isPending}
                className="input min-w-0"
              >
                {roles
                  .filter((role) => role !== "Administrador")
                  .map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleRoleSave}
                disabled={isPending || selectedRole === currentRole}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guardar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg border border-danger/30 px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}
            {feedback && <p className="text-xs text-success">{feedback}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}

function PanelBadge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "dark";
}) {
  const className =
    tone === "dark"
      ? "bg-text-primary text-background"
      : "bg-background text-text-secondary";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const className =
    role === "Administrador"
      ? "bg-text-primary text-background"
      : role === "Director"
        ? "bg-primary/15 text-primary dark:bg-primary/25"
        : role === "Responsable"
          ? "bg-accent/15 text-accent dark:bg-accent/25"
          : "bg-success/15 text-success dark:bg-success/25";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className =
    normalized === "active"
      ? "bg-success/15 text-success dark:bg-success/25"
      : normalized === "disabled"
        ? "bg-danger/15 text-danger dark:bg-danger/25"
        : "bg-accent/15 text-accent dark:bg-accent/25";

  const label =
    normalized === "active"
      ? "Activo"
      : normalized === "disabled"
        ? "Desactivado"
        : "Invitado";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}
