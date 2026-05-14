import type { CurrentUserContext } from "@/lib/current-user";
import type { Action, Module, PermissionEntity } from "./types";
import { can, canFromContext, type UserLike } from "./can";

export function canView(
  user: UserLike,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, "view", resource, entity);
}

export function canCreate(
  user: UserLike,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, "create", resource, entity);
}

export function canUpdate(
  user: UserLike,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, "update", resource, entity);
}

export function canDelete(
  user: UserLike,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, "delete", resource, entity);
}

export function canManage(
  user: UserLike,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, "manage", resource, entity);
}

export function canExport(
  user: UserLike,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, "export", resource, entity);
}

export function canAssign(
  user: UserLike,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, "assign", resource, entity);
}

export function canComplete(
  user: UserLike,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, "complete", resource, entity);
}

export function canDo(
  user: UserLike,
  action: Action,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return can(user, action, resource, entity);
}

export function canViewFromContext(
  ctx: CurrentUserContext | null | undefined,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return canFromContext(ctx, "view", resource, entity);
}

export function canCreateFromContext(
  ctx: CurrentUserContext | null | undefined,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return canFromContext(ctx, "create", resource, entity);
}

export function canUpdateFromContext(
  ctx: CurrentUserContext | null | undefined,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return canFromContext(ctx, "update", resource, entity);
}

export function canDeleteFromContext(
  ctx: CurrentUserContext | null | undefined,
  resource: Module,
  entity?: PermissionEntity
): boolean {
  return canFromContext(ctx, "delete", resource, entity);
}
