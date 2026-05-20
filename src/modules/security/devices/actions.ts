"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { getCurrentDeviceFingerprint } from "./device-fingerprint";
import type { DeviceActionResult } from "./types";

const DEVICES_PATH = "/cuenta/dispositivos";
const MAX_ALIAS_LENGTH = 60;

function isMissingDeviceManagementColumns(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : error instanceof Error
      ? error.message
      : "";

  return (
    message.includes("device_sessions.alias") ||
    message.includes("device_sessions.trusted_at") ||
    message.includes("device_sessions.revoked_at") ||
    message.includes("Could not find the") ||
    message.includes("schema cache")
  );
}

function deviceManagementMigrationMessage() {
  return "Falta aplicar la migracion de Mis dispositivos en Supabase. La vista puede cargar en modo lectura, pero las acciones necesitan los nuevos campos de device_sessions.";
}

async function requireOwnDevice(deviceId: number) {
  const user = await getCurrentUserContext();
  if (!user) throw new Error("No autorizado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { data: device, error } = await supabase
    .from("device_sessions")
    .select("id,user_id,device_fingerprint")
    .eq("id", deviceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!device) throw new Error("Dispositivo no encontrado");

  return {
    user,
    device: device as {
      id: number;
      user_id: number;
      device_fingerprint: string;
    },
    supabase,
  };
}

function normalizeAlias(alias: string) {
  const value = alias.trim().replace(/\s+/g, " ");
  if (!value) throw new Error("El alias no puede estar vacio.");
  if (value.length > MAX_ALIAS_LENGTH) {
    throw new Error(`El alias no puede superar ${MAX_ALIAS_LENGTH} caracteres.`);
  }
  return value;
}

export async function updateMyDeviceAlias(
  deviceId: number,
  alias: string
): Promise<DeviceActionResult> {
  try {
    const { supabase } = await requireOwnDevice(deviceId);
    const safeAlias = normalizeAlias(alias);

    const { error } = await supabase
      .from("device_sessions")
      .update({ alias: safeAlias })
      .eq("id", deviceId);

    if (error) throw new Error(error.message);
    revalidatePath(DEVICES_PATH);
    return { ok: true };
  } catch (error) {
    if (isMissingDeviceManagementColumns(error)) {
      return { ok: false, error: deviceManagementMigrationMessage() };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Error al guardar el alias." };
  }
}

export async function trustMyDevice(deviceId: number): Promise<DeviceActionResult> {
  try {
    const { user, supabase } = await requireOwnDevice(deviceId);
    const { error } = await supabase
      .from("device_sessions")
      .update({
        trusted: true,
        trusted_at: new Date().toISOString(),
        trusted_by: user.id,
        revoked_at: null,
        revoked_by: null,
      })
      .eq("id", deviceId);

    if (error) throw new Error(error.message);
    revalidatePath(DEVICES_PATH);
    return { ok: true };
  } catch (error) {
    if (isMissingDeviceManagementColumns(error)) {
      return { ok: false, error: deviceManagementMigrationMessage() };
    }
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo marcar como confiable." };
  }
}

export async function untrustMyDevice(deviceId: number): Promise<DeviceActionResult> {
  try {
    const { supabase } = await requireOwnDevice(deviceId);
    const { error } = await supabase
      .from("device_sessions")
      .update({ trusted: false, trusted_at: null, trusted_by: null })
      .eq("id", deviceId);

    if (error) throw new Error(error.message);
    revalidatePath(DEVICES_PATH);
    return { ok: true };
  } catch (error) {
    if (isMissingDeviceManagementColumns(error)) {
      return { ok: false, error: deviceManagementMigrationMessage() };
    }
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo quitar la confianza." };
  }
}

export async function revokeMyDeviceSession(deviceId: number): Promise<DeviceActionResult> {
  try {
    const requestHeaders = await headers();
    const current = getCurrentDeviceFingerprint(requestHeaders.get("user-agent"));
    const { user, device, supabase } = await requireOwnDevice(deviceId);
    const isCurrent = device.device_fingerprint === current.deviceIdHash;

    const { error } = await supabase
      .from("device_sessions")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        trusted: false,
        trusted_at: null,
        trusted_by: null,
      })
      .eq("id", deviceId)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    if (isCurrent) {
      const authClient = await createClient();
      await authClient.auth.signOut();
    }

    revalidatePath(DEVICES_PATH);
    return { ok: true, signedOut: isCurrent };
  } catch (error) {
    if (isMissingDeviceManagementColumns(error)) {
      return { ok: false, error: deviceManagementMigrationMessage() };
    }
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo cerrar la sesion." };
  }
}
