/**
 * Tests unitarios para helpers de permisos por rol.
 * Cubren la lógica de autorización sin dependencias externas.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeUserRole,
  canDeletePropiedades,
  canDeleteFincas,
  canDeleteSectores,
  canDeleteZonas,
  canManageUsers,
  canCreateUsers,
  canViewAllAgents,
  canViewSupervisedAgents,
  canSetVendido,
  canManageConfirmationPassword,
  type UserRole,
} from "@/lib/roles";

// ─── normalizeUserRole ────────────────────────────────────────────────────────

describe("normalizeUserRole", () => {
  it("reconoce Administrador con variantes", () => {
    expect(normalizeUserRole("Administrador")).toBe("Administrador");
    expect(normalizeUserRole("administrador")).toBe("Administrador");
    expect(normalizeUserRole("admin")).toBe("Administrador");
    expect(normalizeUserRole("ADMIN")).toBe("Administrador");
  });

  it("reconoce Director", () => {
    expect(normalizeUserRole("Director")).toBe("Director");
    expect(normalizeUserRole("director")).toBe("Director");
  });

  it("reconoce Responsable", () => {
    expect(normalizeUserRole("Responsable")).toBe("Responsable");
    expect(normalizeUserRole("responsable")).toBe("Responsable");
  });

  it("reconoce Agente", () => {
    expect(normalizeUserRole("Agente")).toBe("Agente");
    expect(normalizeUserRole("agente")).toBe("Agente");
  });

  it("devuelve Agente para valores desconocidos o vacíos", () => {
    expect(normalizeUserRole("")).toBe("Agente");
    expect(normalizeUserRole(null)).toBe("Agente");
    expect(normalizeUserRole(undefined)).toBe("Agente");
    expect(normalizeUserRole("Gerente")).toBe("Agente");
  });

  it("normaliza acentos en español", () => {
    expect(normalizeUserRole("Administración")).toBe("Agente"); // no reconocido
    expect(normalizeUserRole("Administrador")).toBe("Administrador");
  });
});

// ─── canDeletePropiedades ─────────────────────────────────────────────────────

describe("canDeletePropiedades", () => {
  it("Administrador puede eliminar propiedades", () => {
    expect(canDeletePropiedades("Administrador")).toBe(true);
  });

  it("Director puede eliminar propiedades", () => {
    expect(canDeletePropiedades("Director")).toBe(true);
  });

  it("Responsable puede eliminar propiedades", () => {
    expect(canDeletePropiedades("Responsable")).toBe(true);
  });

  it("Agente NO puede eliminar propiedades", () => {
    expect(canDeletePropiedades("Agente")).toBe(false);
  });
});

// ─── canDeleteZonas / canDeleteSectores ───────────────────────────────────────

describe("canDeleteZonas y canDeleteSectores", () => {
  const adminDir: UserRole[] = ["Administrador", "Director"];
  const otros: UserRole[] = ["Responsable", "Agente"];

  it("solo Administrador y Director pueden eliminar zonas", () => {
    for (const r of adminDir) expect(canDeleteZonas(r)).toBe(true);
    for (const r of otros) expect(canDeleteZonas(r)).toBe(false);
  });

  it("solo Administrador y Director pueden eliminar sectores", () => {
    for (const r of adminDir) expect(canDeleteSectores(r)).toBe(true);
    for (const r of otros) expect(canDeleteSectores(r)).toBe(false);
  });

  it("canDeleteFincas sigue la misma regla que propiedades", () => {
    expect(canDeleteFincas("Responsable")).toBe(true);
    expect(canDeleteFincas("Agente")).toBe(false);
  });
});

// ─── canManageUsers / canCreateUsers ─────────────────────────────────────────

describe("canManageUsers y canCreateUsers", () => {
  it("Administrador y Director pueden gestionar usuarios", () => {
    expect(canManageUsers("Administrador")).toBe(true);
    expect(canManageUsers("Director")).toBe(true);
  });

  it("Responsable y Agente NO pueden gestionar usuarios", () => {
    expect(canManageUsers("Responsable")).toBe(false);
    expect(canManageUsers("Agente")).toBe(false);
  });

  it("canCreateUsers igual que canManageUsers", () => {
    expect(canCreateUsers("Administrador")).toBe(true);
    expect(canCreateUsers("Agente")).toBe(false);
  });
});

// ─── canViewAllAgents / canViewSupervisedAgents ───────────────────────────────

describe("visibilidad de agentes", () => {
  it("Administrador y Director ven todos los agentes", () => {
    expect(canViewAllAgents("Administrador")).toBe(true);
    expect(canViewAllAgents("Director")).toBe(true);
  });

  it("Responsable y Agente NO ven todos los agentes", () => {
    expect(canViewAllAgents("Responsable")).toBe(false);
    expect(canViewAllAgents("Agente")).toBe(false);
  });

  it("solo Responsable ve agentes supervisados", () => {
    expect(canViewSupervisedAgents("Responsable")).toBe(true);
    expect(canViewSupervisedAgents("Administrador")).toBe(false);
    expect(canViewSupervisedAgents("Director")).toBe(false);
    expect(canViewSupervisedAgents("Agente")).toBe(false);
  });
});

// ─── canSetVendido ────────────────────────────────────────────────────────────

describe("canSetVendido", () => {
  const AGENTE_A = 10;
  const AGENTE_B = 20;
  const RESPONSABLE = 30;
  const supervisados = [AGENTE_A];

  it("Administrador siempre puede marcar como vendido", () => {
    expect(canSetVendido("Administrador", AGENTE_B, RESPONSABLE, [])).toBe(true);
    expect(canSetVendido("Administrador", null, RESPONSABLE, [])).toBe(true);
  });

  it("Director siempre puede marcar como vendido", () => {
    expect(canSetVendido("Director", AGENTE_B, RESPONSABLE, [])).toBe(true);
  });

  it("Responsable puede si la propiedad es propia o de un supervisado", () => {
    // propiedad propia
    expect(canSetVendido("Responsable", RESPONSABLE, RESPONSABLE, supervisados)).toBe(true);
    // propiedad de un supervisado
    expect(canSetVendido("Responsable", AGENTE_A, RESPONSABLE, supervisados)).toBe(true);
    // sin agente asignado
    expect(canSetVendido("Responsable", null, RESPONSABLE, supervisados)).toBe(true);
  });

  it("Responsable NO puede si la propiedad es de un agente no supervisado", () => {
    expect(canSetVendido("Responsable", AGENTE_B, RESPONSABLE, supervisados)).toBe(false);
  });

  it("Agente NUNCA puede marcar como vendido", () => {
    expect(canSetVendido("Agente", AGENTE_A, AGENTE_A, [])).toBe(false);
    expect(canSetVendido("Agente", null, AGENTE_A, [])).toBe(false);
  });

  it("canManageConfirmationPassword solo para Administrador", () => {
    expect(canManageConfirmationPassword("Administrador")).toBe(true);
    expect(canManageConfirmationPassword("Director")).toBe(false);
    expect(canManageConfirmationPassword("Responsable")).toBe(false);
    expect(canManageConfirmationPassword("Agente")).toBe(false);
  });
});
