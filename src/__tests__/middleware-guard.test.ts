/**
 * Tests para la lógica de protección de rutas.
 *
 * El middleware real de Next.js no se puede ejecutar en Vitest directamente,
 * pero podemos testear la función de decisión de acceso de forma aislada,
 * extrayendo la lógica pura de qué rutas son públicas y cuáles requieren sesión.
 */
import { describe, it, expect } from "vitest";

// ─── Lógica de guards extraída del middleware ─────────────────────────────────
// Replica la misma lógica que src/middleware.ts para poder testearla.

const PUBLIC_PATHS = new Set([
  "/login",
  "/recuperar",
  "/nueva-contrasena",
  "/sin-acceso",
  "/offline",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Auth callbacks son públicos
  if (pathname.startsWith("/auth/")) return true;
  // Assets estáticos
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

function requiresAuth(pathname: string): boolean {
  return !isPublicPath(pathname);
}

// Rutas protegidas por rol (solo Responsable/Director/Admin)
const MANAGER_ONLY_PATHS = ["/usuarios", "/desarrollo/insights"];

function requiresManagerRole(pathname: string): boolean {
  return MANAGER_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// ─── Tests de rutas públicas ──────────────────────────────────────────────────

describe("Rutas públicas — no requieren autenticación", () => {
  const publicRoutes = [
    "/login",
    "/recuperar",
    "/nueva-contrasena",
    "/sin-acceso",
    "/offline",
    "/auth/callback",
    "/auth/verificar",
  ];

  for (const route of publicRoutes) {
    it(`${route} es pública`, () => {
      expect(requiresAuth(route)).toBe(false);
    });
  }
});

// ─── Tests de rutas protegidas ────────────────────────────────────────────────

describe("Usuario no autenticado no puede acceder a rutas CRM", () => {
  const protectedRoutes = [
    "/dashboard",
    "/zona",
    "/solicitudes",
    "/contactos",
    "/desarrollo",
    "/calendario",
    "/ordenes",
    "/calculadora",
    "/cuenta",
    "/soporte",
    "/usuarios",
    "/zona/1/sector/2/finca/3",
  ];

  for (const route of protectedRoutes) {
    it(`${route} requiere autenticación`, () => {
      expect(requiresAuth(route)).toBe(true);
    });
  }
});

// ─── Tests de rutas solo para managers ───────────────────────────────────────

describe("Rutas restringidas por rol", () => {
  it("/usuarios requiere rol manager", () => {
    expect(requiresManagerRole("/usuarios")).toBe(true);
  });

  it("/desarrollo/insights requiere rol manager", () => {
    expect(requiresManagerRole("/desarrollo/insights")).toBe(true);
  });

  it("/dashboard NO requiere rol manager (accesible a agentes)", () => {
    expect(requiresManagerRole("/dashboard")).toBe(false);
  });

  it("/solicitudes NO requiere rol manager", () => {
    expect(requiresManagerRole("/solicitudes")).toBe(false);
  });

  it("/zona NO requiere rol manager", () => {
    expect(requiresManagerRole("/zona")).toBe(false);
  });
});

// ─── Tests de lógica de redirect ─────────────────────────────────────────────

describe("Lógica de redirect para usuario sin sesión", () => {
  function getRedirectAction(
    pathname: string,
    hasSession: boolean
  ): "allow" | "redirect_login" | "redirect_sin_acceso" {
    if (!hasSession && requiresAuth(pathname)) return "redirect_login";
    return "allow";
  }

  function getRedirectActionWithRole(
    pathname: string,
    hasSession: boolean,
    role: string | null
  ): "allow" | "redirect_login" | "redirect_sin_acceso" {
    if (!hasSession && requiresAuth(pathname)) return "redirect_login";
    if (hasSession && requiresManagerRole(pathname)) {
      if (!role || (role !== "Administrador" && role !== "Director" && role !== "Responsable")) {
        return "redirect_sin_acceso";
      }
    }
    return "allow";
  }

  it("usuario sin sesión en /dashboard → redirect a login", () => {
    expect(getRedirectAction("/dashboard", false)).toBe("redirect_login");
  });

  it("usuario sin sesión en /login → allow", () => {
    expect(getRedirectAction("/login", false)).toBe("allow");
  });

  it("usuario con sesión en /dashboard → allow", () => {
    expect(getRedirectAction("/dashboard", true)).toBe("allow");
  });

  it("Agente en /usuarios → sin acceso", () => {
    expect(getRedirectActionWithRole("/usuarios", true, "Agente")).toBe("redirect_sin_acceso");
  });

  it("Director en /usuarios → allow", () => {
    expect(getRedirectActionWithRole("/usuarios", true, "Director")).toBe("allow");
  });

  it("Responsable en /desarrollo/insights → allow", () => {
    expect(getRedirectActionWithRole("/desarrollo/insights", true, "Responsable")).toBe("allow");
  });

  it("Agente en /desarrollo/insights → sin acceso", () => {
    expect(getRedirectActionWithRole("/desarrollo/insights", true, "Agente")).toBe("redirect_sin_acceso");
  });
});
