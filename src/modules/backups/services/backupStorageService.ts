import { createAdminClient } from "@/lib/supabase-admin";

export const BACKUP_BUCKET = "backups-privado";

async function ensureBucketExists(): Promise<void> {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BACKUP_BUCKET);
  if (!exists) {
    const { error } = await admin.storage.createBucket(BACKUP_BUCKET, {
      public: false,
      fileSizeLimit: 524288000, // 500 MB
    });
    if (error && !error.message.includes("already exists")) {
      throw new Error(`No se pudo crear el bucket de backups: ${error.message}`);
    }
  }
}

export async function uploadBackupFile(
  empresaId: number | null,
  backupRunId: string,
  relativePath: string,
  data: Buffer | string,
  contentType = "application/octet-stream",
): Promise<string> {
  await ensureBucketExists();
  const admin = createAdminClient();
  const fullPath = `${empresaId ?? "global"}/${backupRunId}/${relativePath}`;
  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;

  const { error } = await admin.storage
    .from(BACKUP_BUCKET)
    .upload(fullPath, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Error al subir ${relativePath}: ${error.message}`);
  return `storage://${BACKUP_BUCKET}/${fullPath}`;
}

export function buildBackupPath(
  empresaId: number | null,
  backupRunId: string,
  relativePath: string,
): string {
  return `${empresaId ?? "global"}/${backupRunId}/${relativePath}`;
}
