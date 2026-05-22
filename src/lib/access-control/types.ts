export type Role = "admin" | "manager" | "commercial" | "support" | "viewer";

export type Module =
  | "dashboard"
  | "agenda"
  | "calendario"
  | "tareas"
  | "kanban"
  | "propiedades"
  | "contactos"
  | "usuarios"
  | "zonas"
  | "ordenes"
  | "configuracion"
  | "backups";

export type Action =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "assign"
  | "export"
  | "manage"
  | "download"
  | "restore_request"
  | "restore_approve"
  | "restore_execute";

export type Resource = `${Module}:${Action}`;

export interface PermissionRule {
  roles: Role[];
  entityScope?: EntityScope;
}

export type EntityScope = "own" | "team" | "any";

export interface PermissionEntity {
  ownerId?: number;
  teamId?: number;
  createdById?: number;
}

export type PermissionMap = Partial<Record<Module, Partial<Record<Action, PermissionRule>>>>;

export const ALL_ROLES: Role[] = ["admin", "manager", "commercial", "support", "viewer"];

export const ADMIN_ROLES: Role[] = ["admin"];
export const MANAGER_ROLES: Role[] = ["admin", "manager"];
export const SUPERVISOR_ROLES: Role[] = ["admin", "manager", "support"];
export const COMMERCIAL_ROLES: Role[] = ["admin", "manager", "support", "commercial"];
export const SUPPORT_ROLES: Role[] = ["admin", "manager", "commercial", "support"];
export const EVERYONE: Role[] = ["admin", "manager", "commercial", "support", "viewer"];
