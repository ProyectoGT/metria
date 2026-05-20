import { describe, expect, it } from "vitest";
import {
  canCreate,
  canDelete,
  canUpdate,
  canView,
  type UserLike,
} from "@/lib/access-control";

const admin: UserLike = { id: 1, role: "admin", equipoId: 10 };
const agent: UserLike = { id: 2, role: "commercial", equipoId: 10 };
const otherAgent: UserLike = { id: 3, role: "commercial", equipoId: 20 };
const viewer: UserLike = { id: 4, role: "viewer", equipoId: 10 };

describe("RBAC helpers", () => {
  it("permite ver recursos base a cualquier rol autenticado", () => {
    expect(canView(viewer, "dashboard")).toBe(true);
    expect(canView(agent, "agenda")).toBe(true);
    expect(canView(agent, "kanban")).toBe(true);
    expect(canView(agent, "contactos")).toBe(true);
  });

  it("permite crear tareas, agenda y contactos con la regla minima actual", () => {
    expect(canCreate(agent, "tareas")).toBe(true);
    expect(canCreate(agent, "agenda")).toBe(true);
    expect(canCreate(agent, "contactos")).toBe(true);
  });

  it("bloquea acciones destructivas a roles sin permiso", () => {
    expect(canDelete(viewer, "tareas")).toBe(false);
    expect(canDelete(agent, "kanban")).toBe(false);
    expect(canDelete(admin, "kanban")).toBe(true);
  });

  it("permite update scoped solo si la entidad pertenece al usuario", () => {
    expect(canUpdate(agent, "tareas", { ownerId: agent.id })).toBe(true);
    expect(canUpdate(agent, "tareas", { ownerId: otherAgent.id })).toBe(false);
  });

  it("bloquea update scoped si no se aporta entidad verificable", () => {
    expect(canUpdate(agent, "tareas")).toBe(false);
    expect(canUpdate(agent, "agenda")).toBe(false);
    expect(canUpdate(agent, "kanban")).toBe(false);
  });
});
