export type {
  Role,
  Module,
  Action,
  Resource,
  PermissionRule,
  EntityScope,
  PermissionEntity,
  PermissionMap,
} from "./types";
export { ALL_ROLES, ADMIN_ROLES, MANAGER_ROLES, SUPERVISOR_ROLES, COMMERCIAL_ROLES, SUPPORT_ROLES, EVERYONE } from "./types";

export {
  getPermissionRule,
  getModulePermissions,
  getAllowedActions,
  getAllowedModules,
} from "./permissions";

export {
  mapDbRoleToCanonical,
  normalizePermissionRole,
  spanishRoleToEnglish,
  englishRoleToSpanish,
  isEnglishRole,
  getSpanishRoleLabel,
  getEnglishRoleLabel,
} from "./role-mapping";

export { can, canFromContext, canOnResource } from "./can";
export type { UserLike } from "./can";

export {
  requirePermission,
  requirePageAccessOrRedirect,
  AuthorizationError,
} from "./guards";

export { Can, ShowForRole } from "./components";
