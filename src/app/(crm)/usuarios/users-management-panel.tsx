"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MoreVertical, Plus, Search } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import { useToast, Toaster } from "@/components/ui/toast";
import { deleteUserAction, updateUserRoleAction } from "./actions";
import CreateUserForm from "./create-user-form";

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
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);
  const { toasts, toast } = useToast();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.rol !== roleFilter) return false;
      if (!query) return true;
      const haystack = `${u.nombre} ${u.apellidos} ${u.correo}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search, roleFilter]);

  return (
    <>
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold text-text-primary">
              Todos los usuarios
            </h2>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-text-secondary">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar"
                className="input h-9 pl-9 pr-3 md:w-64"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input h-9 py-0 text-sm md:w-40"
            >
              <option value="">Todos los rangos</option>
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-text-primary">
              No hay usuarios que coincidan
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Prueba con otros filtros o crea un usuario nuevo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-5 py-3 text-left font-medium text-text-secondary">
                    Usuario
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-text-secondary">
                    Rango
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-text-secondary">
                    Estado
                  </th>
                  <th className="w-12 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onEdit={() => setEditUser(user)}
                    onDelete={() => setDeleteUser(user)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <FormModal
          title="Nuevo usuario"
          onClose={() => setCreateOpen(false)}
        >
          <CreateUserForm
            roles={roles}
            onSuccess={(message) => {
              toast(message);
              setCreateOpen(false);
            }}
          />
        </FormModal>
      )}

      {editUser && (
        <EditRoleDialog
          user={editUser}
          roles={roles}
          onClose={() => setEditUser(null)}
          onSuccess={(message) => {
            toast(message);
            setEditUser(null);
          }}
        />
      )}

      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onSuccess={(message) => {
            toast(message);
            setDeleteUser(null);
          }}
        />
      )}

      <Toaster toasts={toasts} />
    </>
  );
}

function UserRow({
  user,
  onEdit,
  onDelete,
}: {
  user: ManagedUser;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = user.rol === "Administrador";
  const fullName = `${user.nombre} ${user.apellidos}`.trim();

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <tr className="transition-colors hover:bg-background">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={fullName || user.correo} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {fullName || "Sin nombre"}
            </p>
            <p className="truncate text-xs text-text-secondary">{user.correo}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <RoleBadge role={user.rol} />
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge status={user.estado} hasAccess={Boolean(user.authId)} />
      </td>
      <td className="w-12 px-5 py-3.5 text-right">
        {!isAdmin && (
          <div className="relative inline-block" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              aria-label="Acciones"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-background"
                >
                  Cambiar rango
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function EditRoleDialog({
  user,
  roles,
  onClose,
  onSuccess,
}: {
  user: ManagedUser;
  roles: readonly string[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [selectedRole, setSelectedRole] = useState(user.rol);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoleAction({
        userId: user.id,
        rol: selectedRole,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess(result.message ?? "Rango actualizado.");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="text-base font-semibold text-text-primary">
          Cambiar rango
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {`${user.nombre} ${user.apellidos}`.trim()}
        </p>

        <div className="mt-4">
          <label className="text-xs font-medium text-text-secondary">
            Nuevo rango
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            disabled={isPending}
            className="input mt-1.5"
          >
            {roles
              .filter((role) => role !== "Administrador")
              .map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
          </select>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || selectedRole === user.rol}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteUserDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: ManagedUser;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAction({ userId: user.id });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess(result.message ?? "Usuario eliminado.");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="text-base font-semibold text-text-primary">
          Eliminar usuario
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Vas a eliminar o desactivar el acceso de{" "}
          <span className="font-medium text-text-primary">
            {`${user.nombre} ${user.apellidos}`.trim()}
          </span>
          . Esta accion no se puede deshacer.
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
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

function StatusBadge({
  status,
  hasAccess,
}: {
  status: string;
  hasAccess: boolean;
}) {
  const normalized = status.toLowerCase();
  const effectiveStatus = !hasAccess ? "disabled" : normalized;

  const className =
    effectiveStatus === "active"
      ? "bg-success/15 text-success dark:bg-success/25"
      : effectiveStatus === "disabled"
        ? "bg-danger/15 text-danger dark:bg-danger/25"
        : "bg-accent/15 text-accent dark:bg-accent/25";

  const label =
    effectiveStatus === "active"
      ? "Activo"
      : effectiveStatus === "disabled"
        ? "Sin acceso"
        : "Invitado";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}
