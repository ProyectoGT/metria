import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/current-user";
import type { Action, Module, PermissionEntity } from "./types";
import { canFromContext } from "./can";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly action: Action,
    public readonly module: Module
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requirePermission(
  action: Action,
  module: Module,
  entity?: PermissionEntity
): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUserContext>>>> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    redirect("/login");
  }

  if (!canFromContext(currentUser, action, module, entity)) {
    throw new AuthorizationError(
      `No tienes permiso para realizar "${action}" en "${module}".`,
      action,
      module
    );
  }

  return currentUser;
}

export async function requireCanView(module: Module, entity?: PermissionEntity) {
  return requirePermission("view", module, entity);
}

export async function requireCanCreate(module: Module, entity?: PermissionEntity) {
  return requirePermission("create", module, entity);
}

export async function requireCanUpdate(module: Module, entity?: PermissionEntity) {
  return requirePermission("update", module, entity);
}

export async function requireCanDelete(module: Module, entity?: PermissionEntity) {
  return requirePermission("delete", module, entity);
}

export async function requirePageAccessOrRedirect(
  pageKey: string,
  redirectTo = "/dashboard"
): Promise<void> {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) redirect("/login");

  const permModule = pageKeyToModule(pageKey);
  if (permModule && !canFromContext(currentUser, "view", permModule)) {
    redirect(redirectTo);
  }
}

function pageKeyToModule(pageKey: string): Module | null {
  const pageToModule: Record<string, Module> = {
    dashboard: "dashboard",
    zona: "zonas",
    "zonas-geograficas": "zonas",
    propiedades: "propiedades",
    solicitudes: "propiedades",
    contactos: "contactos",
    calendario: "calendario",
    ordenes: "ordenes",
    usuarios: "usuarios",
    configuracion: "configuracion",
    desarrollo: "dashboard",
    email: "contactos",
    calculadora: "dashboard",
    soporte: "configuracion",
    cuenta: "dashboard",
  };
  return pageToModule[pageKey] ?? null;
}
