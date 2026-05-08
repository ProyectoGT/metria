import { cache } from "react";
import { createClient } from "@/lib/supabase";
import type { CurrentUserContext } from "@/lib/current-user";
import type { UserRole } from "@/lib/roles";

type RuleRow = {
  resource_key: string;
  resource_type: string;
  action: string;
};

// ─── Base system permission map ─────────────────────────────────────────────
// Solo definimos recursos que YA tienen restricciones en el sistema actual.
// Si un recurso no está aquí, el sistema base permite acceso total.
const BASE_PERMISSION: Record<string, (role: UserRole) => boolean> = {
  usuarios:              (r) => r === "Administrador" || r === "Director",
  organigrama:           (r) => r === "Administrador" || r === "Director" || r === "Responsable",
  insights:              (r) => r === "Administrador" || r === "Director" || r === "Responsable",
  configuracion:         (r) => r === "Administrador",

  "properties.delete":   (r) => r === "Administrador" || r === "Director" || r === "Responsable",
  "properties.vendido":  (r) => r === "Administrador" || r === "Director" || r === "Responsable",
  "properties.web_publish": (r) => r === "Administrador" || r === "Director",

  "zones.delete_sector": (r) => r === "Administrador" || r === "Director",
  "zones.delete_zona":   (r) => r === "Administrador" || r === "Director",

  "zones.draw_new":      (r) => r === "Administrador" || r === "Director",
  "zones.edit_geometry": (r) => r === "Administrador" || r === "Director",
  "zones.archive":       (r) => r === "Administrador" || r === "Director",

  "users.create":        (r) => r === "Administrador" || r === "Director",
  "users.edit":          (r) => r === "Administrador" || r === "Director",
  "users.delete":        (r) => r === "Administrador" || r === "Director",
  "users.change_role":   (r) => r === "Administrador" || r === "Director",

  "security.settings":   (r) => r === "Administrador",
  "soporte.respond":     (r) => r === "Administrador",
  "collaborations.manage_all": (r) => r === "Administrador" || r === "Director",
  "metrics.view_all":    (r) => r === "Administrador" || r === "Director" || r === "Responsable",
  "tasks.assign_others": (r) => r === "Administrador" || r === "Director" || r === "Responsable",
};

function getBasePermission(resourceKey: string, role: UserRole): boolean {
  const check = BASE_PERMISSION[resourceKey];
  return check ? check(role) : true;
}

// ─── Query denied resources from DB (cached per request) ────────────────────
export const getDeniedResourceKeys = cache(
  async (empresaId: number, role: UserRole): Promise<Set<string>> => {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rules } = await (supabase as any)
      .from("access_control_rules")
      .select("resource_key, resource_type, action")
      .eq("empresa_id", empresaId)
      .eq("role", role)
      .eq("enabled", false);

    if (!rules || rules.length === 0) return new Set();
    return new Set(rules.map((r: RuleRow) => r.resource_key));
  }
);

// ─── Page access check (base + configurable) ────────────────────────────────
export async function canAccessPage(
  currentUser: Pick<CurrentUserContext, "role" | "empresaId">,
  pageKey: string
): Promise<boolean> {
  if (pageKey === "configuracion" && currentUser.role === "Administrador") return true;

  if (!getBasePermission(pageKey, currentUser.role)) return false;

  if (!currentUser.empresaId) return true;

  const denied = await getDeniedResourceKeys(currentUser.empresaId, currentUser.role);
  return !denied.has(pageKey);
}

// ─── Feature access check (base + configurable) ─────────────────────────────
export async function canUseFeature(
  currentUser: Pick<CurrentUserContext, "role" | "empresaId">,
  featureKey: string
): Promise<boolean> {
  if (!getBasePermission(featureKey, currentUser.role)) return false;

  if (!currentUser.empresaId) return true;

  const denied = await getDeniedResourceKeys(currentUser.empresaId, currentUser.role);
  return !denied.has(featureKey);
}

// ─── Public helper: map page key → sidebar href ─────────────────────────────
export const PAGE_HREF: Record<string, string> = {
  dashboard:  "/dashboard",
  zona:       "/zona",
  "zonas-geograficas": "/zonas-geograficas",
  propiedades: "/propiedades",
  solicitudes: "/solicitudes",
  contactos:  "/contactos",
  email:      "/email",
  desarrollo: "/desarrollo",
  insights:   "/desarrollo/insights",
  calendario: "/calendario",
  ordenes:    "/ordenes",
  calculadora: "/calculadora",
  usuarios:   "/usuarios",
  organigrama: "/empresa/organigrama",
  cuenta:     "/cuenta",
  soporte:    "/soporte",
  configuracion: "/configuracion/control-acceso",
};

// ─── Sync helper for client components (pre-computed allowed pages) ─────────
export function canAccessPageSync(
  deniedKeys: Set<string>,
  role: UserRole,
  pageKey: string
): boolean {
  if (pageKey === "configuracion" && role === "Administrador") return true;
  if (!getBasePermission(pageKey, role)) return false;
  return !deniedKeys.has(pageKey);
}
