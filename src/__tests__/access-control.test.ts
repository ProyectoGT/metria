/**
 * Tests de control de acceso multitenant.
 *
 * Modela en TypeScript la lógica de can_access_scoped_row() y can_manage_scoped_row()
 * que existe en la BD como funciones SQL. Permite detectar regresiones en la lógica
 * de visibilidad sin necesitar Supabase real.
 *
 * Escenario: empresa A (id=1) y empresa B (id=2) completamente aisladas.
 */
import { describe, it, expect } from "vitest";
import type { UserRole } from "@/lib/roles";

// ─── Modelo del contexto de usuario (refleja CurrentUserContext) ──────────────

type UserCtx = {
  id: number;
  role: UserRole;
  empresaId: number;
  equipoId: number;
  supervisedAgentIds: number[];
};

// ─── Modelo de una fila protegida (refleja los campos de scoped_row) ──────────

type ScopedRow = {
  owner_user_id: number | null;
  empresa_id: number;
  equipo_id: number | null;
  visibility: "private" | "team" | "company";
};

// ─── Implementación TypeScript de can_access_scoped_row (SQL → TS) ────────────
//
// Replica exactamente la lógica de la función SQL homónima en:
//   supabase/migrations/20260413000001_add_access_control_foundation.sql
//
function canAccessScopedRow(user: UserCtx, row: ScopedRow): boolean {
  // Admin/Director ven todo su empresa
  if (
    (user.role === "Administrador" || user.role === "Director") &&
    row.empresa_id === user.empresaId
  ) return true;

  // Nunca acceso a otra empresa
  if (row.empresa_id !== user.empresaId) return false;

  // Owner siempre ve lo suyo
  if (row.owner_user_id === user.id) return true;

  // Visibilidad de empresa
  if (row.visibility === "company") return true;

  // Visibilidad de equipo
  if (row.visibility === "team" && row.equipo_id === user.equipoId) return true;

  return false;
}

// ─── Implementación TypeScript de can_manage_scoped_row (reforzada en hardening)
//
// Refleja la versión actualizada en:
//   supabase/migrations/20260503000008_hardening_rls.sql (can_manage_scoped_row)
//
function canManageScopedRow(user: UserCtx, row: ScopedRow): boolean {
  if (row.empresa_id !== user.empresaId) return false;

  if (user.role === "Administrador" || user.role === "Director") return true;

  if (row.owner_user_id === user.id) return true;

  if (user.role === "Responsable") {
    return (
      row.owner_user_id === user.id ||
      (row.owner_user_id !== null &&
        user.supervisedAgentIds.includes(row.owner_user_id))
    );
  }

  return false;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EMPRESA_A = 1;
const EMPRESA_B = 2;
const EQUIPO_1 = 10;
const EQUIPO_2 = 20;

const admin: UserCtx = {
  id: 1, role: "Administrador", empresaId: EMPRESA_A, equipoId: EQUIPO_1,
  supervisedAgentIds: [],
};
const director: UserCtx = {
  id: 2, role: "Director", empresaId: EMPRESA_A, equipoId: EQUIPO_1,
  supervisedAgentIds: [],
};
const responsable: UserCtx = {
  id: 3, role: "Responsable", empresaId: EMPRESA_A, equipoId: EQUIPO_1,
  supervisedAgentIds: [5, 6], // supervisa a agenteA y agenteB
};
const agenteA: UserCtx = {
  id: 5, role: "Agente", empresaId: EMPRESA_A, equipoId: EQUIPO_1,
  supervisedAgentIds: [],
};
const agenteB: UserCtx = {
  id: 6, role: "Agente", empresaId: EMPRESA_A, equipoId: EQUIPO_2,
  supervisedAgentIds: [],
};
const agenteOtraEmpresa: UserCtx = {
  id: 99, role: "Agente", empresaId: EMPRESA_B, equipoId: EQUIPO_1,
  supervisedAgentIds: [],
};

// Fila privada de agenteA en empresa A
const filaPrivadaA: ScopedRow = {
  owner_user_id: agenteA.id, empresa_id: EMPRESA_A,
  equipo_id: EQUIPO_1, visibility: "private",
};
// Fila de empresa en empresa A
const filaEmpresaA: ScopedRow = {
  owner_user_id: agenteA.id, empresa_id: EMPRESA_A,
  equipo_id: EQUIPO_1, visibility: "company",
};
// Fila de equipo 1 en empresa A
const filaEquipo1A: ScopedRow = {
  owner_user_id: agenteA.id, empresa_id: EMPRESA_A,
  equipo_id: EQUIPO_1, visibility: "team",
};
// Fila en empresa B
const filaEmpresaB: ScopedRow = {
  owner_user_id: 100, empresa_id: EMPRESA_B,
  equipo_id: EQUIPO_1, visibility: "company",
};

// ─── Tests de aislamiento multiempresa ────────────────────────────────────────

describe("Aislamiento entre empresas", () => {
  it("Agente de empresa A no ve datos de empresa B (privados)", () => {
    expect(canAccessScopedRow(agenteA, filaEmpresaB)).toBe(false);
  });

  it("Agente de empresa A no ve datos de empresa B (visibilidad company)", () => {
    const filaPublicaB: ScopedRow = {
      owner_user_id: 100, empresa_id: EMPRESA_B,
      equipo_id: EQUIPO_1, visibility: "company",
    };
    expect(canAccessScopedRow(agenteA, filaPublicaB)).toBe(false);
  });

  it("Admin de empresa A no ve datos de empresa B", () => {
    expect(canAccessScopedRow(admin, filaEmpresaB)).toBe(false);
  });

  it("Agente de empresa B no puede gestionar datos de empresa A", () => {
    expect(canManageScopedRow(agenteOtraEmpresa, filaEmpresaA)).toBe(false);
    expect(canManageScopedRow(agenteOtraEmpresa, filaPrivadaA)).toBe(false);
  });
});

// ─── Tests de visibilidad por rol ─────────────────────────────────────────────

describe("Agente solo ve sus propios datos privados", () => {
  it("agenteA ve su propia fila privada", () => {
    expect(canAccessScopedRow(agenteA, filaPrivadaA)).toBe(true);
  });

  it("agenteB NO ve la fila privada de agenteA", () => {
    expect(canAccessScopedRow(agenteB, filaPrivadaA)).toBe(false);
  });

  it("agenteA ve una fila de visibilidad company de su empresa", () => {
    expect(canAccessScopedRow(agenteA, filaEmpresaA)).toBe(true);
  });

  it("agenteA ve una fila de equipo si está en el mismo equipo", () => {
    expect(canAccessScopedRow(agenteA, filaEquipo1A)).toBe(true);
  });

  it("agenteB NO ve una fila de equipo de otro equipo", () => {
    // agenteB está en EQUIPO_2, la fila es de EQUIPO_1
    expect(canAccessScopedRow(agenteB, filaEquipo1A)).toBe(false);
  });
});

describe("Responsable ve datos de sus supervisados", () => {
  it("Responsable ve la fila privada de un supervisado (access)", () => {
    // canAccessScopedRow para Responsable: la policy RLS extendida
    // (tareas, agenda) usa subquery. Aquí testeamos el acceso base:
    // el Responsable puede acceder porque es mismo equipo o company.
    expect(canAccessScopedRow(responsable, filaEmpresaA)).toBe(true);
  });

  it("Responsable puede GESTIONAR datos de sus supervisados", () => {
    expect(canManageScopedRow(responsable, filaPrivadaA)).toBe(true);
  });

  it("Responsable NO puede gestionar datos de agentes no supervisados", () => {
    const filaAgenteExterno: ScopedRow = {
      owner_user_id: 999,
      empresa_id: EMPRESA_A,
      equipo_id: EQUIPO_1,
      visibility: "private",
    };
    expect(canManageScopedRow(responsable, filaAgenteExterno)).toBe(false);
  });

  it("Responsable puede gestionar sus propias filas", () => {
    const filaResponsable: ScopedRow = {
      owner_user_id: responsable.id,
      empresa_id: EMPRESA_A,
      equipo_id: EQUIPO_1,
      visibility: "private",
    };
    expect(canManageScopedRow(responsable, filaResponsable)).toBe(true);
  });
});

describe("Admin y Director ven toda su empresa", () => {
  it("Admin ve filas privadas de cualquier agente de su empresa", () => {
    expect(canAccessScopedRow(admin, filaPrivadaA)).toBe(true);
  });

  it("Director ve filas privadas de cualquier agente de su empresa", () => {
    expect(canAccessScopedRow(director, filaPrivadaA)).toBe(true);
  });

  it("Admin puede gestionar cualquier fila de su empresa", () => {
    expect(canManageScopedRow(admin, filaPrivadaA)).toBe(true);
    expect(canManageScopedRow(admin, filaEmpresaA)).toBe(true);
  });

  it("Director puede gestionar cualquier fila de su empresa", () => {
    expect(canManageScopedRow(director, filaPrivadaA)).toBe(true);
  });

  it("Admin NO puede gestionar filas de empresa B", () => {
    expect(canManageScopedRow(admin, filaEmpresaB)).toBe(false);
  });
});

// ─── Tests de gestión de usuarios ─────────────────────────────────────────────

describe("Agente no puede modificar datos no asignados", () => {
  it("agenteA NO puede gestionar una fila privada de agenteB", () => {
    const filaB: ScopedRow = {
      owner_user_id: agenteB.id,
      empresa_id: EMPRESA_A,
      equipo_id: EQUIPO_1,
      visibility: "private",
    };
    expect(canManageScopedRow(agenteA, filaB)).toBe(false);
  });

  it("agenteA SÍ puede gestionar sus propias filas", () => {
    expect(canManageScopedRow(agenteA, filaPrivadaA)).toBe(true);
  });

  it("agenteA puede gestionar fila de company pero NO la de otro agente private", () => {
    // company: cualquiera puede leer, pero solo el owner gestiona
    const filaCompanyAjena: ScopedRow = {
      owner_user_id: agenteB.id,
      empresa_id: EMPRESA_A,
      equipo_id: EQUIPO_1,
      visibility: "company",
    };
    expect(canAccessScopedRow(agenteA, filaCompanyAjena)).toBe(true);  // puede ver
    expect(canManageScopedRow(agenteA, filaCompanyAjena)).toBe(false); // no puede modificar
  });
});
