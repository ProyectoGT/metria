"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { canDrawZones, canEditZoneGeometry, canDeleteZonasGeograficas } from "@/lib/roles";
import { validateCreateInput, validateGeoJsonPolygon } from "./validation";
import type { ZonaGeografica } from "@/types";
import type { ZonaGeoCreateInput, ZonaGeoUpdateInput } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createAdminClient() as any;

export async function listZonasGeograficas(): Promise<ZonaGeografica[]> {
  const yo = await getCurrentUserContext();
  if (!yo) return [];

  const { data } = await db()
    .from("zonas_geograficas")
    .select("*")
    .eq("empresa_id", yo.empresaId ?? -1)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as ZonaGeografica[];
}

export async function getZonaGeografica(id: number): Promise<ZonaGeografica | null> {
  const yo = await getCurrentUserContext();
  if (!yo) return null;

  const { data } = await db()
    .from("zonas_geograficas")
    .select("*")
    .eq("id", id)
    .eq("empresa_id", yo.empresaId ?? -1)
    .single();

  return data as ZonaGeografica | null;
}

export async function createZonaGeografica(input: ZonaGeoCreateInput): Promise<{ ok: boolean; error?: string; id?: number }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado." };

  if (!canDrawZones(yo.role)) {
    return { ok: false, error: "No tienes permiso para crear zonas." };
  }

  const validation = validateCreateInput({
    nombre: input.nombre,
    geojson: input.geojson,
    empresa_id: yo.empresaId,
  });
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const { data, error } = await db()
    .from("zonas_geograficas")
    .insert({
      empresa_id: yo.empresaId,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() ?? null,
      color: input.color,
      tipo: input.tipo ?? "personalizada",
      geojson: input.geojson,
      created_by: yo.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/zonas-geograficas");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id as number };
}

export async function updateZonaGeografica(
  id: number,
  input: ZonaGeoUpdateInput,
): Promise<{ ok: boolean; error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado." };

  if (!canEditZoneGeometry(yo.role)) {
    return { ok: false, error: "No tienes permiso para editar zonas." };
  }

  const updateData: Record<string, unknown> = { updated_by: yo.id };

  if (input.nombre !== undefined) updateData.nombre = input.nombre.trim();
  if (input.descripcion !== undefined) updateData.descripcion = input.descripcion?.trim() ?? null;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.tipo !== undefined) updateData.tipo = input.tipo;

  const { error } = await db()
    .from("zonas_geograficas")
    .update(updateData)
    .eq("id", id)
    .eq("empresa_id", yo.empresaId ?? -1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/zonas-geograficas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateZonaGeometria(
  id: number,
  geojson: ZonaGeoCreateInput["geojson"],
): Promise<{ ok: boolean; error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado." };

  if (!canEditZoneGeometry(yo.role)) {
    return { ok: false, error: "No tienes permiso para editar geometria." };
  }

  const validation = validateGeoJsonPolygon(geojson);
  if (!validation.valid) return { ok: false, error: validation.error };

  const { error } = await db()
    .from("zonas_geograficas")
    .update({ geojson, updated_by: yo.id })
    .eq("id", id)
    .eq("empresa_id", yo.empresaId ?? -1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/zonas-geograficas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function archiveZonaGeografica(id: number): Promise<{ ok: boolean; error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado." };

  if (!canDeleteZonasGeograficas(yo.role)) {
    return { ok: false, error: "No tienes permiso para archivar zonas." };
  }

  const { error } = await db()
    .from("zonas_geograficas")
    .update({ archived_at: new Date().toISOString(), updated_by: yo.id, estado: "archivada" })
    .eq("id", id)
    .eq("empresa_id", yo.empresaId ?? -1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/zonas-geograficas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteZonaGeografica(id: number): Promise<{ ok: boolean; error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado." };

  if (!canDeleteZonasGeograficas(yo.role)) {
    return { ok: false, error: "No tienes permiso para eliminar zonas." };
  }

  const { error } = await db()
    .from("zonas_geograficas")
    .delete()
    .eq("id", id)
    .eq("empresa_id", yo.empresaId ?? -1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/zonas-geograficas");
  revalidatePath("/dashboard");
  return { ok: true };
}
