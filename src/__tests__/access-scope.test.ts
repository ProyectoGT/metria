/**
 * Tests para normalizeAccessScope y constantes de visibilidad.
 */
import { describe, it, expect } from "vitest";
import { normalizeAccessScope, ACCESS_SCOPES, ACCESS_SCOPE_LABELS } from "@/lib/access-scope";

describe("normalizeAccessScope", () => {
  it("acepta todos los scopes válidos", () => {
    expect(normalizeAccessScope("private")).toBe("private");
    expect(normalizeAccessScope("company")).toBe("company");
    expect(normalizeAccessScope("team")).toBe("team");
    expect(normalizeAccessScope("agents")).toBe("agents");
    expect(normalizeAccessScope("responsable")).toBe("responsable");
  });

  it("devuelve private para valores desconocidos", () => {
    expect(normalizeAccessScope("public")).toBe("private");
    expect(normalizeAccessScope("")).toBe("private");
    expect(normalizeAccessScope(null)).toBe("private");
    expect(normalizeAccessScope(undefined)).toBe("private");
    expect(normalizeAccessScope("admin_only")).toBe("private");
  });

  it("no acepta valores que no estén en ACCESS_SCOPES", () => {
    for (const scope of ACCESS_SCOPES) {
      expect(normalizeAccessScope(scope)).toBe(scope);
    }
    expect(normalizeAccessScope("global")).toBe("private");
  });

  it("todos los scopes tienen etiqueta en español", () => {
    for (const scope of ACCESS_SCOPES) {
      expect(ACCESS_SCOPE_LABELS[scope]).toBeTruthy();
      expect(typeof ACCESS_SCOPE_LABELS[scope]).toBe("string");
    }
  });
});
