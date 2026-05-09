export type Role = "admin" | "manager" | "commercial" | "support" | "viewer";

export type Module =
  | "dashboard"
  | "calendario"
  | "tareas"
  | "propiedades"
  | "contactos"
  | "usuarios"
  | "zonas"
  | "ordenes"
  | "configuracion";

export type Action =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "assign"
  | "export"
  | "manage";

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
export const SUPERVISOR_ROLES: Role[] = ["admin", "manager"];
export const COMMERCIAL_ROLES: Role[] = ["admin", "manager", "commercial"];
export const SUPPORT_ROLES: Role[] = ["admin", "manager", "commercial", "support"];
export const EVERYONE: Role[] = ["admin", "manager", "commercial", "support", "viewer"];
