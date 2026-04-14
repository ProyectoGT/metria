import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createAdminClient } from "@/lib/supabase-admin";

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "scrypt";
const ENV_PASSWORD = process.env.DELETE_CONFIRMATION_PASSWORD?.trim() ?? "";

export type ConfirmationPasswordStatus = {
  source: "database" | "env" | "missing";
  configured: boolean;
};

type StoredConfiguration = {
  source: "database";
  hash: string;
};

async function hashValue(value: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(value, salt, 64)) as Buffer;

  return `${HASH_PREFIX}:${salt}:${derivedKey.toString("hex")}`;
}

async function verifyStoredHash(value: string, storedHash: string) {
  const [prefix, salt, hash] = storedHash.split(":");

  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const derived = (await scrypt(value, salt, expected.length)) as Buffer;

  return timingSafeEqual(expected, derived);
}

async function getStoredConfiguration(): Promise<StoredConfiguration | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("configuracion_seguridad")
    .select("delete_confirmation_password_hash")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (
      error.message.includes("configuracion_seguridad") ||
      error.code === "PGRST205" ||
      error.code === "42P01"
    ) {
      return null;
    }

    throw error;
  }

  if (!data?.delete_confirmation_password_hash) {
    return null;
  }

  return {
    source: "database",
    hash: data.delete_confirmation_password_hash,
  };
}

export async function getConfirmationPasswordStatus(): Promise<ConfirmationPasswordStatus> {
  const stored = await getStoredConfiguration();

  if (stored) {
    return { source: "database", configured: true };
  }

  if (ENV_PASSWORD) {
    return { source: "env", configured: true };
  }

  return { source: "missing", configured: false };
}

export async function verifyConfirmationPassword(password: string) {
  const candidate = password.trim();

  if (!candidate) {
    return {
      ok: false,
      reason: "Debes introducir la contraseña de confirmación.",
    };
  }

  const stored = await getStoredConfiguration();

  if (stored) {
    const valid = await verifyStoredHash(candidate, stored.hash);

    return valid
      ? { ok: true as const }
      : {
          ok: false as const,
          reason: "La contraseña de confirmación no es correcta.",
        };
  }

  if (ENV_PASSWORD) {
    const candidateBuffer = Buffer.from(candidate);
    const expectedBuffer = Buffer.from(ENV_PASSWORD);
    const valid =
      candidateBuffer.length === expectedBuffer.length &&
      timingSafeEqual(candidateBuffer, expectedBuffer);

    return valid
      ? { ok: true as const }
      : {
          ok: false as const,
          reason: "La contraseña de confirmación no es correcta.",
        };
  }

  return {
    ok: false as const,
    reason:
      "Todavía no hay una contraseña de confirmación configurada. Configúrala desde Cuenta.",
  };
}

export async function saveConfirmationPassword(password: string, updatedBy: number) {
  const normalized = password.trim();

  if (normalized.length < 8) {
    throw new Error("La contraseña de confirmación debe tener al menos 8 caracteres.");
  }

  const hash = await hashValue(normalized);
  const supabase = createAdminClient();
  const { error } = await supabase.from("configuracion_seguridad").upsert({
    id: 1,
    delete_confirmation_password_hash: hash,
    updated_by: updatedBy,
  });

  if (error) {
    throw error;
  }
}
