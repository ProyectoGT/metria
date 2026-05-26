import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import type { StorageBucketBackupResult, StorageObjectBackup } from "../types/backup.types";
import { BACKUP_BUCKET } from "./backupStorageService";
import { backupDb } from "./backupDb";

const OBJECTS_BATCH = 50;

function sha256(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  return Buffer.from(await blob.arrayBuffer());
}

type StorageManifestEntry = {
  bucket: string;
  path: string;
  backup_path: string;
  size_bytes: number;
  content_type: string;
  checksum: string;
  status: "copied" | "failed" | "skipped";
  error?: string;
};

// ── Obtener rutas de empresa via tabla archivos ────────────────────────────

async function getCompanyFilePaths(empresaId: number | null): Promise<string[]> {
  if (!empresaId) return [];
  const { data } = await backupDb()
    .from("archivos")
    .select("storage_path")
    .eq("empresa_id", empresaId)
    .not("storage_path", "is", null);

  const rows = (data ?? []) as Array<{ storage_path: string | null }>;
  return rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
}

// ── Obtener IDs de usuarios de la empresa ─────────────────────────────────

async function getCompanyUserIds(empresaId: number | null): Promise<number[]> {
  if (!empresaId) return [];
  const { data } = await backupDb()
    .from("usuarios")
    .select("id")
    .eq("empresa_id", empresaId);

  const rows = (data ?? []) as Array<{ id: number }>;
  return rows.map((r) => r.id);
}

// ── Copiar un objeto de un bucket al backup ───────────────────────────────

async function copyObjectToBackup(
  sourceBucket: string,
  sourcePath: string,
  empresaId: number | null,
  backupRunId: string,
): Promise<StorageObjectBackup> {
  const admin = createAdminClient();
  const backupRelativePath = `storage/${sourceBucket}/${sourcePath}`;
  const backupFullPath = `${empresaId ?? "global"}/${backupRunId}/${backupRelativePath}`;

  try {
    // Download from source bucket
    const { data: blob, error: dlError } = await admin.storage.from(sourceBucket).download(sourcePath);
    if (dlError || !blob) {
      return {
        path: sourcePath,
        backup_path: backupRelativePath,
        size_bytes: 0,
        content_type: "unknown",
        checksum: "",
        status: "failed",
        error: dlError?.message ?? "No se pudo descargar el archivo",
      };
    }

    const buffer = await blobToBuffer(blob);
    const checksum = sha256(buffer);
    const contentType = blob.type || "application/octet-stream";

    // Upload to backup bucket
    const { error: upError } = await admin.storage
      .from(BACKUP_BUCKET)
      .upload(backupFullPath, buffer, { contentType, upsert: true });

    if (upError) {
      return {
        path: sourcePath,
        backup_path: backupRelativePath,
        size_bytes: buffer.length,
        content_type: contentType,
        checksum,
        status: "failed",
        error: upError.message,
      };
    }

    return {
      path: sourcePath,
      backup_path: backupRelativePath,
      size_bytes: buffer.length,
      content_type: contentType,
      checksum,
      status: "copied",
    };
  } catch (err) {
    return {
      path: sourcePath,
      backup_path: backupRelativePath,
      size_bytes: 0,
      content_type: "unknown",
      checksum: "",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Backup de encargo-archivos ────────────────────────────────────────────

async function backupEncargoArchivos(
  empresaId: number | null,
  backupRunId: string,
): Promise<StorageBucketBackupResult> {
  const paths = await getCompanyFilePaths(empresaId);
  const objects: StorageObjectBackup[] = [];
  let totalSize = 0;

  for (let i = 0; i < paths.length; i += OBJECTS_BATCH) {
    const batch = paths.slice(i, i + OBJECTS_BATCH);
    const results = await Promise.all(
      batch.map((p) => copyObjectToBackup("encargo-archivos", p, empresaId, backupRunId)),
    );
    for (const r of results) {
      objects.push(r);
      if (r.status === "copied") totalSize += r.size_bytes;
    }
  }

  const copied = objects.filter((o) => o.status === "copied").length;
  const failed = objects.filter((o) => o.status === "failed").length;
  const status =
    objects.length === 0
      ? "empty"
      : failed === 0
        ? "complete"
        : copied === 0
          ? "failed"
          : "partial";

  return {
    bucket: "encargo-archivos",
    label: "Documentos e imagenes de propiedades",
    total_objects: objects.length,
    copied_objects: copied,
    failed_objects: failed,
    total_size_bytes: totalSize,
    status,
    objects,
  };
}

// ── Backup de avatars ─────────────────────────────────────────────────────

async function backupAvatars(
  empresaId: number | null,
  backupRunId: string,
): Promise<StorageBucketBackupResult> {
  const admin = createAdminClient();
  const userIds = await getCompanyUserIds(empresaId);
  const objects: StorageObjectBackup[] = [];
  let totalSize = 0;

  for (const userId of userIds) {
    const { data: files } = await admin.storage.from("avatars").list(String(userId));
    if (!files || files.length === 0) continue;

    for (const file of files) {
      if (file.name === ".emptyFolderPlaceholder") continue;
      const sourcePath = `${userId}/${file.name}`;
      const result = await copyObjectToBackup("avatars", sourcePath, empresaId, backupRunId);
      objects.push(result);
      if (result.status === "copied") totalSize += result.size_bytes;
    }
  }

  const copied = objects.filter((o) => o.status === "copied").length;
  const failed = objects.filter((o) => o.status === "failed").length;
  const status =
    objects.length === 0
      ? "empty"
      : failed === 0
        ? "complete"
        : copied === 0
          ? "failed"
          : "partial";

  return {
    bucket: "avatars",
    label: "Avatares de usuarios",
    total_objects: objects.length,
    copied_objects: copied,
    failed_objects: failed,
    total_size_bytes: totalSize,
    status,
    objects,
  };
}

// ── Resultado agregado de todos los buckets ───────────────────────────────

export type StorageExportResult = {
  bucket_details: Record<string, StorageBucketBackupResult>;
  total_objects: number;
  total_copied: number;
  total_failed: number;
  total_size_bytes: number;
  storage_export: "complete" | "partial" | "failed" | "empty";
  warnings: string[];
  errors: string[];
};

export async function exportStorageBuckets(
  empresaId: number | null,
  backupRunId: string,
  includeStorage: boolean,
): Promise<StorageExportResult> {
  const result: StorageExportResult = {
    bucket_details: {},
    total_objects: 0,
    total_copied: 0,
    total_failed: 0,
    total_size_bytes: 0,
    storage_export: "empty",
    warnings: [],
    errors: [],
  };

  if (!includeStorage) {
    result.storage_export = "empty";
    return result;
  }

  const bucketResults = await Promise.allSettled([
    backupEncargoArchivos(empresaId, backupRunId),
    backupAvatars(empresaId, backupRunId),
  ]);

  const bucketDefs = [
    { key: "encargo-archivos", critical: true },
    { key: "avatars", critical: false },
  ];

  let hasComplete = false;
  let hasCriticalFailure = false;
  let hasAnyFailure = false;

  for (let i = 0; i < bucketResults.length; i++) {
    const settled = bucketResults[i];
    const def = bucketDefs[i];

    if (settled.status === "fulfilled") {
      const br = settled.value;
      result.bucket_details[br.bucket] = br;
      result.total_objects += br.total_objects;
      result.total_copied += br.copied_objects;
      result.total_failed += br.failed_objects;
      result.total_size_bytes += br.total_size_bytes;

      if (br.status === "complete" || br.status === "empty") {
        hasComplete = true;
      } else if (br.status === "failed") {
        hasAnyFailure = true;
        if (def.critical) hasCriticalFailure = true;
        result.errors.push(`Bucket ${br.bucket}: backup fallido completamente.`);
      } else if (br.status === "partial") {
        hasAnyFailure = true;
        result.warnings.push(`Bucket ${br.bucket}: ${br.failed_objects} objeto(s) fallaron.`);
      }
    } else {
      hasAnyFailure = true;
      if (def.critical) hasCriticalFailure = true;
      result.errors.push(`Bucket ${def.key}: error inesperado — ${settled.reason}`);
    }
  }

  if (hasCriticalFailure) {
    result.storage_export = "failed";
  } else if (hasAnyFailure) {
    result.storage_export = "partial";
  } else if (hasComplete) {
    result.storage_export = "complete";
  }

  return result;
}

// ── Storage manifest para upload ──────────────────────────────────────────

export function buildStorageManifest(
  empresaId: number | null,
  backupRunId: string,
  storageResult: StorageExportResult,
): StorageManifestEntry[] {
  const entries: StorageManifestEntry[] = [];
  for (const [, br] of Object.entries(storageResult.bucket_details)) {
    for (const obj of br.objects) {
      entries.push({
        bucket: br.bucket,
        path: obj.path,
        backup_path: obj.backup_path,
        size_bytes: obj.size_bytes,
        content_type: obj.content_type,
        checksum: obj.checksum,
        status: obj.status,
        error: obj.error,
      });
    }
  }
  return entries;
}

// ── Registrar artifacts de storage ───────────────────────────────────────

export async function registerStorageArtifacts(
  empresaId: number | null,
  backupRunId: string,
  bucketDetails: Record<string, StorageBucketBackupResult>,
): Promise<void> {
  const db = backupDb();
  const rows = [];

  for (const [, br] of Object.entries(bucketDetails)) {
    for (const obj of br.objects) {
      if (obj.status === "copied") {
        rows.push({
          empresa_id: empresaId,
          backup_run_id: backupRunId,
          artifact_type: "storage_object",
          path: obj.backup_path,
          bucket: br.bucket,
          size_bytes: obj.size_bytes,
          checksum: obj.checksum,
          content_type: obj.content_type,
          metadata: { source_path: obj.path, source_bucket: br.bucket },
        });
      }
    }
    // Process in chunks to avoid large inserts
    if (rows.length >= 50) {
      await db.from("backup_artifacts").insert([...rows]);
      rows.length = 0;
    }
  }

  if (rows.length > 0) {
    await db.from("backup_artifacts").insert(rows);
  }
}
