import { backupDb } from "./backupDb";
import type { BackupRun } from "../types/backup.types";

export type ChainValidationResult =
  | { valid: true; baseFullBackup: BackupRun; chain: BackupRun[] }
  | { valid: false; error: string };

const MAX_CHAIN_DEPTH = 365;

/**
 * Recorre la cadena de backups desde el padre hasta el full base.
 * Valida que cada eslabón exista, pertenezca a la empresa y esté verificado.
 */
export async function validateBackupChain(
  parentRunId: string,
  empresaId: number | null,
): Promise<ChainValidationResult> {
  const chain: BackupRun[] = [];
  let currentId: string = parentRunId;

  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth++) {
    const { data } = await backupDb()
      .from("backup_runs")
      .select("*")
      .eq("id", currentId)
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (!data) {
      return { valid: false, error: `Cadena rota: backup ${currentId} no encontrado o pertenece a otra empresa.` };
    }

    const run = data as BackupRun;

    if (run.status !== "verified") {
      return {
        valid: false,
        error: `Cadena rota: el backup ${run.id} no esta verificado (estado actual: ${run.status}).`,
      };
    }

    chain.push(run);

    if (run.backup_type === "full") {
      return { valid: true, baseFullBackup: run, chain };
    }

    if (!run.parent_backup_id) {
      return {
        valid: false,
        error: `Cadena rota: backup incremental ${run.id} no tiene referencia al backup padre.`,
      };
    }

    currentId = run.parent_backup_id;
  }

  return { valid: false, error: "Cadena demasiado larga o con referencia circular detectada." };
}

/**
 * Devuelve el backup full verificado mas reciente de la empresa.
 */
export async function getLastVerifiedFull(empresaId: number | null): Promise<BackupRun | null> {
  const { data } = await backupDb()
    .from("backup_runs")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("backup_type", "full")
    .eq("status", "verified")
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as BackupRun | null;
}

/**
 * Devuelve el backup verificado mas reciente (full o incremental).
 */
export async function getLastVerifiedBackup(empresaId: number | null): Promise<BackupRun | null> {
  const { data } = await backupDb()
    .from("backup_runs")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("status", "verified")
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as BackupRun | null;
}

/**
 * Determina la ventana from/to para un incremental dado su backup padre.
 */
export function getIncrementalWindow(parentRun: BackupRun, now: Date): { from: Date; to: Date } {
  const from = parentRun.verified_at ? new Date(parentRun.verified_at) : new Date(parentRun.created_at);
  return { from, to: now };
}
