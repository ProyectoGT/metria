export const USER_ROLES = [
  "Administrador",
  "Director",
  "Responsable",
  "Agente",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLES_HIERARCHY: Record<UserRole, number> = {
  Administrador: 100,
  Director: 75,
  Responsable: 50,
  Agente: 25,
};

export function roleGte(role: UserRole, minRole: UserRole): boolean {
  return (USER_ROLES_HIERARCHY[role] ?? 0) >= (USER_ROLES_HIERARCHY[minRole] ?? 0);
}

export function roleLte(role: UserRole, maxRole: UserRole): boolean {
  return (USER_ROLES_HIERARCHY[role] ?? 0) <= (USER_ROLES_HIERARCHY[maxRole] ?? 0);
}

function normalizeRoleValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export function normalizeUserRole(value: string | null | undefined): UserRole {
  const normalized = normalizeRoleValue(value);

  switch (normalized) {
    case "administrador":
    case "admin":
      return "Administrador";
    case "director":
      return "Director";
    case "responsable":
      return "Responsable";
    case "agente":
      return "Agente";
    default:
      return "Agente";
  }
}

export function canDeletePropiedades(role: UserRole) {
  return roleGte(role, "Responsable");
}

export function canDeleteFincas(role: UserRole) {
  return canDeletePropiedades(role);
}

export function canDeleteSectores(role: UserRole) {
  return roleGte(role, "Director");
}

export function canDeleteZonas(role: UserRole) {
  return canDeleteSectores(role);
}

export function canDrawZones(role: UserRole) {
  return roleGte(role, "Director");
}

export function canEditZoneGeometry(role: UserRole) {
  return roleGte(role, "Director");
}

export function canDeleteZonasGeograficas(role: UserRole) {
  return roleGte(role, "Director");
}

export function canManageConfirmationPassword(role: UserRole) {
  return role === "Administrador";
}

export function canAccessContactos(role: UserRole) {
  return role === "Administrador";
}

export function canViewIdealistaLeads(role: UserRole) {
  return role === "Administrador";
}

export function canManageUsers(role: UserRole) {
  return roleGte(role, "Director");
}

export function canCreateUsers(role: UserRole) {
  return roleGte(role, "Director");
}

export function canViewAllAgents(role: UserRole) {
  return roleGte(role, "Director");
}

export function canBeAssignedProperty(role: string | null | undefined) {
  return normalizeUserRole(role) !== "Administrador";
}

export function canViewSupervisedAgents(role: UserRole) {
  return role === "Responsable";
}

export function canViewOrgChart(role: UserRole) {
  return roleGte(role, "Responsable");
}

export function canViewInsights(role: UserRole) {
  return canViewOrgChart(role);
}

export function canAccessEmail(_role: UserRole) {
  void _role;
  return true;
}

/**
 * Determina si un usuario puede marcar una propiedad como "vendido".
 * - Administrador y Director: siempre.
 * - Responsable: solo si la propiedad está asignada a él mismo o a un agente que supervisa.
 * - Agente: nunca.
 */
export function canSetVendido(
  role: UserRole,
  agenteAsignadoId: number | null,
  currentUserId: number,
  supervisedAgentIds: number[]
): boolean {
  if (roleGte(role, "Director")) return true;
  if (role === "Responsable") {
    if (agenteAsignadoId === null) return true;
    return agenteAsignadoId === currentUserId || supervisedAgentIds.includes(agenteAsignadoId);
  }
  return false;
}
