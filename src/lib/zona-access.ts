import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/roles";

export type ZonaPermissionLevel = "read" | "write" | "admin";

const ZONA_PERMISSION_RANK: Record<ZonaPermissionLevel, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

export function normalizeZonaPermissionLevel(value: unknown): ZonaPermissionLevel {
  return value === "admin" || value === "write" || value === "read" ? value : "read";
}

export function hasZonaPermission(
  level: ZonaPermissionLevel | null | undefined,
  required: ZonaPermissionLevel,
): boolean {
  if (!level) return false;
  return ZONA_PERMISSION_RANK[level] >= ZONA_PERMISSION_RANK[required];
}

export function roleHasGlobalPropertyWrite(role: UserRole): boolean {
  return role === "Administrador" || role === "Director";
}

export function roleHasGlobalPropertyDelete(role: UserRole): boolean {
  return role === "Administrador" || role === "Director" || role === "Responsable";
}

export async function getZonaPermissionLevel(
  supabase: SupabaseClient,
  zonaId: number | null | undefined,
  usuarioId: number,
): Promise<ZonaPermissionLevel | null> {
  if (!zonaId) return null;

  const { data } = await supabase
    .from("zona_acceso")
    .select("permission_level")
    .eq("zona_id", zonaId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  const raw = (data as { permission_level?: unknown } | null)?.permission_level;
  return raw == null ? null : normalizeZonaPermissionLevel(raw);
}

export async function getZonaPermissionForFinca(
  supabase: SupabaseClient,
  fincaId: number,
  usuarioId: number,
): Promise<ZonaPermissionLevel | null> {
  const { data } = await supabase
    .from("fincas")
    .select("sectores(zona_id)")
    .eq("id", fincaId)
    .maybeSingle();

  const zonaId = (data as { sectores?: { zona_id?: number | null } | null } | null)?.sectores?.zona_id;
  return getZonaPermissionLevel(supabase, zonaId, usuarioId);
}

export async function getZonaPermissionForPropiedad(
  supabase: SupabaseClient,
  propiedadId: number,
  usuarioId: number,
): Promise<ZonaPermissionLevel | null> {
  const { data } = await supabase
    .from("propiedades")
    .select("fincas(sectores(zona_id))")
    .eq("id", propiedadId)
    .maybeSingle();

  const zonaId = (data as {
    fincas?: { sectores?: { zona_id?: number | null } | null } | null;
  } | null)?.fincas?.sectores?.zona_id;

  return getZonaPermissionLevel(supabase, zonaId, usuarioId);
}
