export const USER_ROLES = [
  "Administrador",
  "Director",
  "Responsable",
  "Agente",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

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
  return (
    role === "Administrador" ||
    role === "Director" ||
    role === "Responsable"
  );
}

export function canDeleteFincas(role: UserRole) {
  return canDeletePropiedades(role);
}

export function canDeleteSectores(role: UserRole) {
  return role === "Administrador" || role === "Director";
}

export function canDeleteZonas(role: UserRole) {
  return canDeleteSectores(role);
}

export function canManageConfirmationPassword(role: UserRole) {
  return role === "Administrador";
}

export function canManageUsers(role: UserRole) {
  return role === "Administrador" || role === "Director";
}

export function canCreateUsers(role: UserRole) {
  return role === "Administrador" || role === "Director";
}

export function canViewAllAgents(role: UserRole) {
  return role === "Administrador" || role === "Director";
}

export function canViewSupervisedAgents(role: UserRole) {
  return role === "Responsable";
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
  if (role === "Administrador" || role === "Director") return true;
  if (role === "Responsable") {
    if (agenteAsignadoId === null) return true;
    return agenteAsignadoId === currentUserId || supervisedAgentIds.includes(agenteAsignadoId);
  }
  return false;
}
