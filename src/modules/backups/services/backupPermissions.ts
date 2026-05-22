import type { CurrentUserContext } from "@/lib/current-user";
import type { UserRole } from "@/lib/roles";

export class BackupAuthorizationError extends Error {
  constructor(message = "No tienes permisos para esta operacion de copias de seguridad.") {
    super(message);
    this.name = "BackupAuthorizationError";
  }
}

const READ_ROLES: UserRole[] = ["Administrador", "Director"];
const MANAGE_ROLES: UserRole[] = ["Administrador"];
const RESTORE_APPROVER_ROLES: UserRole[] = ["Administrador", "Director"];

export function canReadBackups(user: CurrentUserContext | null | undefined): boolean {
  return Boolean(user && READ_ROLES.includes(user.role));
}

export function canCreateBackup(user: CurrentUserContext | null | undefined): boolean {
  return Boolean(user && MANAGE_ROLES.includes(user.role));
}

export function canManageBackupProfiles(user: CurrentUserContext | null | undefined): boolean {
  return Boolean(user && MANAGE_ROLES.includes(user.role));
}

export function canDownloadBackup(user: CurrentUserContext | null | undefined): boolean {
  return Boolean(user && MANAGE_ROLES.includes(user.role));
}

export function canRequestRestore(user: CurrentUserContext | null | undefined): boolean {
  return Boolean(user && READ_ROLES.includes(user.role));
}

export function canApproveRestore(
  user: CurrentUserContext | null | undefined,
  restoreRun?: { requested_by: number | null },
): boolean {
  if (!user || !RESTORE_APPROVER_ROLES.includes(user.role)) return false;
  if (restoreRun?.requested_by && restoreRun.requested_by === user.id) return false;
  return true;
}

export function assertCanReadBackups(user: CurrentUserContext | null | undefined): asserts user is CurrentUserContext {
  if (!canReadBackups(user)) throw new BackupAuthorizationError();
}

export function assertCanCreateBackup(user: CurrentUserContext | null | undefined): asserts user is CurrentUserContext {
  if (!canCreateBackup(user)) throw new BackupAuthorizationError("Solo administradores pueden crear copias manuales.");
}

export function assertCanManageBackupProfiles(user: CurrentUserContext | null | undefined): asserts user is CurrentUserContext {
  if (!canManageBackupProfiles(user)) throw new BackupAuthorizationError("Solo administradores pueden gestionar automatizaciones de backup.");
}

export function assertCanDownloadBackup(user: CurrentUserContext | null | undefined): asserts user is CurrentUserContext {
  if (!canDownloadBackup(user)) throw new BackupAuthorizationError("Solo administradores pueden descargar copias.");
}

export function assertCanRequestRestore(user: CurrentUserContext | null | undefined): asserts user is CurrentUserContext {
  if (!canRequestRestore(user)) throw new BackupAuthorizationError("No tienes permisos para solicitar restauraciones.");
}

export function assertCanApproveRestore(
  user: CurrentUserContext | null | undefined,
  restoreRun?: { requested_by: number | null },
): asserts user is CurrentUserContext {
  if (!canApproveRestore(user, restoreRun)) {
    throw new BackupAuthorizationError("No puedes aprobar esta restauracion.");
  }
}
