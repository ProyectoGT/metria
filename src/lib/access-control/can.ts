import type { Action, EntityScope, Module, PermissionEntity, Role } from "./types";
import { getPermissionRule } from "./permissions";
import { mapDbRoleToCanonical } from "./role-mapping";
import type { UserRole } from "@/lib/roles";
import type { CurrentUserContext } from "@/lib/current-user";

export type UserLike = {
  role: Role | UserRole | string | null | undefined;
  id?: number;
  empresaId?: number | null;
  equipoId?: number | null;
  supervisedAgentIds?: number[];
};

function toCanonicalRole(user: UserLike): Role {
  if (!user.role) return "viewer";
  const r = user.role as string;
  if (["admin", "manager", "commercial", "support", "viewer"].includes(r)) {
    return r as Role;
  }
  return mapDbRoleToCanonical(r);
}

function matchesEntityScope(
  scope: EntityScope | undefined,
  entity: PermissionEntity | undefined,
  user: UserLike
): boolean {
  if (!scope || scope === "any") return true;
  if (!entity) return false;

  if (scope === "own") {
    if (entity.ownerId !== undefined && user.id !== undefined) {
      return entity.ownerId === user.id;
    }
    if (entity.createdById !== undefined && user.id !== undefined) {
      return entity.createdById === user.id;
    }
    if (entity.teamId !== undefined && user.equipoId !== undefined) {
      return entity.teamId === user.equipoId;
    }
    return false;
  }

  if (scope === "team") {
    if (entity.ownerId !== undefined && user.id !== undefined) {
      if (entity.ownerId === user.id) return true;
      if (user.supervisedAgentIds?.includes(entity.ownerId)) return true;
    }
    if (entity.teamId !== undefined && user.equipoId !== undefined) {
      return entity.teamId === user.equipoId;
    }
    return false;
  }

  return false;
}

export function can(
  user: UserLike,
  action: Action,
  module: Module,
  entity?: PermissionEntity
): boolean {
  const role = toCanonicalRole(user);
  const rule = getPermissionRule(module, action);

  if (!rule) return false;
  if (!rule.roles.includes(role)) return false;

  if (!matchesEntityScope(rule.entityScope, entity, user)) return false;

  return true;
}

export function canFromContext(
  ctx: CurrentUserContext | null | undefined,
  action: Action,
  module: Module,
  entity?: PermissionEntity
): boolean {
  if (!ctx) return false;
  return can(
    {
      role: ctx.role,
      id: ctx.id,
      empresaId: ctx.empresaId,
      equipoId: ctx.equipoId,
      supervisedAgentIds: ctx.supervisedAgentIds,
    },
    action,
    module,
    entity
  );
}

export function canOnResource(
  user: UserLike,
  resource: string
): boolean {
  const parts = resource.split(":");
  if (parts.length < 2) return false;
  const [module, action] = parts as [Module, Action];
  return can(user, action, module);
}
