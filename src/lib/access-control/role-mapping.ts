import type { UserRole } from "@/lib/roles";
import type { Role } from "./types";

const DB_ROLE_TO_ENGLISH: Record<string, Role> = {
  administrador: "admin",
  admin: "admin",
  director: "manager",
  responsable: "support",
  agente: "commercial",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export function mapDbRoleToCanonical(dbRole: string | null | undefined): Role {
  if (!dbRole) return "viewer";
  const key = normalize(dbRole);
  return DB_ROLE_TO_ENGLISH[key] ?? "viewer";
}

export function normalizePermissionRole(
  dbRole: string | null | undefined
): Role {
  return mapDbRoleToCanonical(dbRole);
}

export function spanishRoleToEnglish(
  dbRole: string | null | undefined
): Role {
  return mapDbRoleToCanonical(dbRole);
}

export function englishRoleToSpanish(role: Role): UserRole {
  const reverse: Record<Role, UserRole> = {
    admin: "Administrador",
    manager: "Director",
    commercial: "Agente",
    support: "Responsable",
    viewer: "Agente",
  };
  return reverse[role] ?? "Agente";
}

export function isEnglishRole(value: string): value is Role {
  return ["admin", "manager", "commercial", "support", "viewer"].includes(value);
}

export function getSpanishRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    admin: "Administrador",
    manager: "Director",
    commercial: "Agente",
    support: "Responsable",
    viewer: "Invitado",
  };
  return labels[role] ?? role;
}

export function getEnglishRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    admin: "Admin",
    manager: "Manager",
    commercial: "Commercial",
    support: "Support",
    viewer: "Viewer",
  };
  return labels[role] ?? role;
}
