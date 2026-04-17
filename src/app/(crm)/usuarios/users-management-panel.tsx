"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MoreVertical, Plus, Search, UserCheck, UserX } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import { useToast, Toaster } from "@/components/ui/toast";
import {
  deleteUserAction,
  updateUserRoleAction,
  updateUserInfoAction,
  toggleUserStatusAction,
  updateUserSupervisorAction,
} from "./actions";
import CreateUserForm from "./create-user-form";
import type { UserRole } from "@/lib/roles";

type ManagedUser = {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  estado: string;
  authId: string | null;
  supervisorId: number | null;
};

type SupervisorOption = {
  id: number;
  nombre: string;
  apellidos: string;
  rol: string;
};

type Props = {
  users: ManagedUser[];
  roles: readonly string[];
  supervisors: SupervisorOption[];
  currentUserRole: UserRole;
  currentUserId: number;
};

const DIRECTOR_ALLOWED_ROLES = ["Responsable", "Agente"];

export default function UsersManagementPanel({
  users: initialUsers,
  roles,
  supervisors,
  currentUserRole,
  currentUserId,
}: Props) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);
  const { toasts, toast } = useToast();

  const isAdmin = currentUserRole === "Administrador";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.rol !== roleFilter) return false;
      if (!query) return true;
      const haystack = `${u.nombre} ${u.apellidos} ${u.correo}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search, roleFilter]);

  function handleUserUpdated(updated: Partial<ManagedUser> & { id: number }) {
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
    );
  }

  function handleUserRemoved(userId: number) {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

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
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "45%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
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
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isCurrentUser={user.id === currentUserId}
                    isAdmin={isAdmin}
                    onEdit={() => setEditUser(user)}
                    onDelete={() => setDeleteUser(user)}
                    onToggleStatus={(updated) => handleUserUpdated(updated)}
                    onToast={toast}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <FormModal title="Nuevo usuario" onClose={() => setCreateOpen(false)}>
          <CreateUserForm
            roles={roles}
            supervisors={supervisors}
            currentUserRole={currentUserRole}
            onSuccess={(message) => {
              toast(message);
              setCreateOpen(false);
            }}
          />
        </FormModal>
      )}

      {editUser && (
        <EditUserDialog
          user={editUser}
          roles={roles}
          supervisors={supervisors}
          onClose={() => setEditUser(null)}
          onSuccess={(message, updated) => {
            toast(message);
            handleUserUpdated({ id: editUser.id, ...updated });
            setEditUser(null);
          }}
        />
      )}

      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onSuccess={(message, removed) => {
            toast(message);
            if (removed) {
              handleUserRemoved(deleteUser.id);
            } else {
              handleUserUpdated({ id: deleteUser.id, estado: "disabled", authId: null });
            }
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
  isCurrentUser,
  isAdmin,
  onEdit,
  onDelete,
  onToggleStatus,
  onToast,
}: {
  user: ManagedUser;
  isCurrentUser: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (updated: Partial<ManagedUser> & { id: number }) => void;
  onToast: (msg: string, type?: "error") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [isPending, startTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdminUser = user.rol === "Administrador";
  const isActive = user.estado === "active";
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

  function openMenu() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMenuOpen((v) => !v);
  }

  function handleToggle() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await toggleUserStatusAction({ userId: user.id });
      if (result.error) {
        onToast(result.error, "error");
        return;
      }
      onToast(result.message ?? "Estado actualizado.");
      onToggleStatus({ id: user.id, estado: result.status ?? (isActive ? "disabled" : "active") });
    });
  }

  const canAct = isAdmin && !isCurrentUser && !isAdminUser;

  return (
    <tr className={`transition-colors hover:bg-background ${user.estado !== "active" ? "opacity-60" : ""}`}>
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
        {canAct && (
          <div className="relative inline-block">
            <button
              ref={btnRef}
              type="button"
              onClick={openMenu}
              disabled={isPending}
              className="rounded p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary disabled:opacity-50"
              aria-label="Acciones"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                style={{ position: "fixed", top: menuPos.top, right: menuPos.right }}
                className="z-50 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="block w-full px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-background"
                >
                  Editar informacion
                </button>
                <button
                  type="button"
                  onClick={handleToggle}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-background"
                >
                  {isActive ? (
                    <>
                      <UserX className="h-3.5 w-3.5 text-warning" />
                      Desactivar acceso
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5 text-success" />
                      Activar acceso
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDelete(); }}
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

function EditUserDialog({
  user,
  roles,
  supervisors,
  onClose,
  onSuccess,
}: {
  user: ManagedUser;
  roles: readonly string[];
  supervisors: SupervisorOption[];
  onClose: () => void;
  onSuccess: (message: string, updated: Partial<ManagedUser>) => void;
}) {
  const [form, setForm] = useState({
    nombre: user.nombre,
    apellidos: user.apellidos,
    correo: user.correo,
    rol: user.rol,
    supervisorId: user.supervisorId,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsSupervisor = form.rol === "Agente" || form.rol === "Responsable";
  const availableSupervisors = supervisors.filter((s) => s.id !== user.id);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserInfoAction({
        userId: user.id,
        nombre: form.nombre,
        apellidos: form.apellidos,
        correo: form.correo,
        rol: form.rol,
        supervisorId: needsSupervisor ? form.supervisorId : null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess(result.message ?? "Usuario actualizado.", {
        nombre: form.nombre,
        apellidos: form.apellidos,
        correo: form.correo,
        rol: form.rol,
        supervisorId: needsSupervisor ? form.supervisorId : null,
      });
    });
  }

  const editableRoles = roles.filter((r) => r !== "Administrador");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">Editar usuario</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">×</button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className="input"
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Apellidos</label>
              <input
                value={form.apellidos}
                onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                className="input"
                placeholder="Apellidos"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Correo</label>
            <input
              type="email"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              className="input"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Rango</label>
            <div className="grid grid-cols-3 gap-2">
              {editableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rol: role }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.rol === role
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {needsSupervisor && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Supervisor</label>
              <select
                value={form.supervisorId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    supervisorId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="input"
              >
                <option value="">Sin supervisor asignado</option>
                {availableSupervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {`${s.nombre} ${s.apellidos}`.trim()} ({s.rol})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
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
  onSuccess: (message: string, removed: boolean) => void;
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
      onSuccess(result.message ?? "Usuario eliminado.", result.removed ?? false);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="text-base font-semibold text-text-primary">Eliminar usuario</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Vas a eliminar el perfil de{" "}
          <span className="font-medium text-text-primary">
            {`${user.nombre} ${user.apellidos}`.trim()}
          </span>
          . Si tiene datos vinculados en el CRM, se desactivara su acceso en su lugar.
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
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
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status, hasAccess }: { status: string; hasAccess: boolean }) {
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
        ? "Desactivado"
        : "Invitado";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}
