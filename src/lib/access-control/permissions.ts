import type { Action, Module, PermissionRule } from "./types";
import {
  ADMIN_ROLES,
  COMMERCIAL_ROLES,
  EVERYONE,
  MANAGER_ROLES,
  SUPPORT_ROLES,
  SUPERVISOR_ROLES,
} from "./types";

const PERMISSIONS: Partial<Record<Module, Partial<Record<Action, PermissionRule>>>> = {
  dashboard: {
    view: { roles: EVERYONE },
    export: { roles: MANAGER_ROLES },
  },
  calendario: {
    view: { roles: EVERYONE },
    create: { roles: EVERYONE },
    update: { roles: EVERYONE, entityScope: "own" },
    delete: { roles: SUPERVISOR_ROLES },
    export: { roles: MANAGER_ROLES },
  },
  tareas: {
    view: { roles: EVERYONE },
    create: { roles: EVERYONE },
    update: { roles: EVERYONE, entityScope: "own" },
    delete: { roles: SUPERVISOR_ROLES },
    complete: { roles: EVERYONE, entityScope: "own" },
    assign: { roles: SUPERVISOR_ROLES },
  },
  propiedades: {
    view: { roles: EVERYONE },
    create: { roles: EVERYONE },
    update: { roles: EVERYONE },
    delete: { roles: SUPERVISOR_ROLES },
    export: { roles: MANAGER_ROLES },
  },
  contactos: {
    view: { roles: EVERYONE },
    create: { roles: EVERYONE },
    update: { roles: EVERYONE },
    delete: { roles: EVERYONE },
    export: { roles: MANAGER_ROLES },
  },
  usuarios: {
    view: { roles: MANAGER_ROLES },
    create: { roles: MANAGER_ROLES },
    update: { roles: MANAGER_ROLES },
    delete: { roles: ADMIN_ROLES },
    manage: { roles: ADMIN_ROLES },
  },
  zonas: {
    view: { roles: EVERYONE },
    create: { roles: COMMERCIAL_ROLES },
    update: { roles: COMMERCIAL_ROLES },
    delete: { roles: SUPERVISOR_ROLES },
  },
  ordenes: {
    view: { roles: SUPPORT_ROLES },
    create: { roles: COMMERCIAL_ROLES },
    update: { roles: COMMERCIAL_ROLES },
    complete: { roles: COMMERCIAL_ROLES },
    export: { roles: MANAGER_ROLES },
  },
  configuracion: {
    view: { roles: ADMIN_ROLES },
    manage: { roles: ADMIN_ROLES },
  },
};

export function getPermissionRule(
  module: Module,
  action: Action
): PermissionRule | undefined {
  return PERMISSIONS[module]?.[action];
}

export function getModulePermissions(module: Module): Partial<Record<Action, PermissionRule>> | undefined {
  return PERMISSIONS[module];
}

export function getAllowedActions(module: Module, role: string): Action[] {
  const modulePerms = PERMISSIONS[module];
  if (!modulePerms) return [];

  return (Object.entries(modulePerms) as [string, PermissionRule][])
    .filter(([, rule]) => rule.roles.includes(role as never))
    .map(([action]) => action as Action);
}

export function getAllowedModules(role: string): Module[] {
  const allowed: Module[] = [];
  for (const [module, actions] of Object.entries(PERMISSIONS)) {
    const hasAnyAction = Object.values(actions).some((rule) =>
      (rule as PermissionRule).roles.includes(role as never)
    );
    if (hasAnyAction) {
      allowed.push(module as Module);
    }
  }
  return allowed;
}
