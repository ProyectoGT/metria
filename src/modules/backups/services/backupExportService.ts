import crypto from "node:crypto";
import zlib from "node:zlib";
import type { BackupEntityDefinition } from "../types/backup.types";
import type { BackupManifestEntity } from "../types/backup.types";
import { SENSITIVE_BACKUP_FIELDS, redactSensitiveFields } from "../config/sensitiveFields";
import { uploadBackupFile } from "./backupStorageService";
import { backupDb } from "./backupDb";
import type { ChangeLogRow } from "./backupChangeLogService";

const BATCH_SIZE = 500;

type EntityExportResult = {
  entityKey: string;
  result: BackupManifestEntity;
};

type DatabaseExportResult = {
  entities: Record<string, BackupManifestEntity>;
  warnings: string[];
  errors: string[];
  database_export: "complete" | "partial" | "failed";
  total_rows: number;
  total_size_bytes: number;
};

type SchemaSnapshot = {
  generated_at: string;
  app_version: string;
  entities: Array<{
    key: string;
    table: string;
    priority: string;
    company_filtered: boolean;
    redacted_fields: string[];
  }>;
};

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function fetchEntityRows(
  table: string,
  companyField: string | null | undefined,
  empresaId: number | null,
): Promise<Record<string, unknown>[]> {
  const db = backupDb();
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const query = db
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    // Only apply empresa filter when field exists and empresaId is known
    const typedQuery = companyField && empresaId
      ? (query as unknown as { eq: (col: string, val: unknown) => typeof query }).eq(companyField, empresaId)
      : query;

    // Apply offset via range workaround (limit + manual pagination)
    const { data, error } = await (typedQuery as unknown as { then: (resolve: (v: { data: unknown; error: unknown }) => void) => void; range: (from: number, to: number) => { then: (resolve: (v: { data: unknown; error: unknown }) => void) => void } }).range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(`Error al exportar ${table}: ${(error as { message: string }).message}`);

    const rows = (data as Record<string, unknown>[] | null) ?? [];
    allRows.push(...rows);

    if (rows.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return allRows;
}

async function exportEntity(
  entity: BackupEntityDefinition,
  empresaId: number | null,
  backupRunId: string,
): Promise<EntityExportResult> {
  const priority = entity.priority ?? "optional";
  const filePath = `data/${entity.key}.jsonl.gz`;

  try {
    const rows = await fetchEntityRows(entity.table, entity.companyField, empresaId);

    // Build combined redact list: entity-specific + global sensitive fields
    const entityRedact = entity.redactFields ?? [];
    const globalSensitive = SENSITIVE_BACKUP_FIELDS.filter((f) => !entityRedact.includes(f));
    const allRedact = [...entityRedact, ...globalSensitive];

    // Redact sensitive fields
    const sanitizedRows = rows.map((row) => redactSensitiveFields(row, allRedact));

    // Build JSONL (one JSON object per line)
    const jsonl = sanitizedRows.map((row) => JSON.stringify(row)).join("\n");
    const jsonlBuffer = Buffer.from(jsonl, "utf-8");

    // Compress with gzip
    const compressed = zlib.gzipSync(jsonlBuffer);
    const checksum = sha256(compressed);

    // Upload to Storage
    await uploadBackupFile(empresaId, backupRunId, filePath, compressed, "application/gzip");

    return {
      entityKey: entity.key,
      result: {
        table: entity.table,
        rows: rows.length,
        file: filePath,
        checksum,
        size_bytes: compressed.length,
        status: "exported",
        priority,
        redacted_fields: allRedact.filter((f) => sanitizedRows.some((r) => f in r)),
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      entityKey: entity.key,
      result: {
        table: entity.table,
        rows: 0,
        file: filePath,
        checksum: "",
        size_bytes: 0,
        status: "failed",
        priority,
        error,
      },
    };
  }
}

export async function exportDatabaseEntities(
  empresaId: number | null,
  backupRunId: string,
  entities: BackupEntityDefinition[],
): Promise<DatabaseExportResult> {
  const result: DatabaseExportResult = {
    entities: {},
    warnings: [],
    errors: [],
    database_export: "complete",
    total_rows: 0,
    total_size_bytes: 0,
  };

  let hasCriticalFailure = false;
  let hasAnyFailure = false;

  for (const entity of entities) {
    const exported = await exportEntity(entity, empresaId, backupRunId);
    result.entities[exported.entityKey] = exported.result;

    if (exported.result.status === "exported") {
      result.total_rows += exported.result.rows;
      result.total_size_bytes += exported.result.size_bytes;
    } else if (exported.result.status === "failed") {
      hasAnyFailure = true;
      const msg = `${entity.label} (${entity.table}): ${exported.result.error}`;

      if (entity.priority === "critical") {
        hasCriticalFailure = true;
        result.errors.push(`[CRITICO] ${msg}`);
      } else {
        result.warnings.push(`[ADVERTENCIA] ${msg}`);
      }
    }
  }

  if (hasCriticalFailure) {
    result.database_export = "failed";
  } else if (hasAnyFailure) {
    result.database_export = "partial";
  }

  return result;
}

export async function generateSchemaSnapshot(
  entities: BackupEntityDefinition[],
  appVersion: string,
): Promise<SchemaSnapshot> {
  return {
    generated_at: new Date().toISOString(),
    app_version: appVersion,
    entities: entities.map((e) => ({
      key: e.key,
      table: e.table,
      priority: e.priority ?? "optional",
      company_filtered: Boolean(e.companyField && e.companyField !== "id"),
      redacted_fields: e.redactFields ?? [],
    })),
  };
}

export async function generateChecksumFile(
  entities: Record<string, BackupManifestEntity>,
  manifestChecksum: string,
  schemaChecksum: string,
): Promise<string> {
  const lines: string[] = [
    `${manifestChecksum}  manifest.json`,
    `${schemaChecksum}  schema.json`,
  ];

  for (const [key, entity] of Object.entries(entities)) {
    if (entity.status === "exported" && entity.checksum) {
      lines.push(`${entity.checksum}  data/${key}.jsonl.gz`);
    }
  }

  return lines.join("\n");
}

export async function registerEntityArtifacts(
  empresaId: number | null,
  backupRunId: string,
  entities: Record<string, BackupManifestEntity>,
): Promise<void> {
  const db = backupDb();
  const rows = Object.entries(entities)
    .filter(([, e]) => e.status === "exported")
    .map(([key, e]) => ({
      empresa_id: empresaId,
      backup_run_id: backupRunId,
      artifact_type: "database_dump",
      path: `data/${key}.jsonl.gz`,
      size_bytes: e.size_bytes,
      checksum: e.checksum,
      content_type: "application/gzip",
      metadata: {
        entity_key: key,
        table: e.table,
        rows: e.rows,
        priority: e.priority,
      },
    }));

  if (rows.length > 0) {
    await db.from("backup_artifacts").insert(rows);
  }
}

// ── Exportacion incremental ───────────────────────────────────────────────

type IncrementalEntityResult = {
  entityKey: string;
  modified: number;
  deleted: number;
  file: string;
  checksum: string;
  size_bytes: number;
  status: "exported" | "skipped" | "failed";
  error?: string;
  detected_via: "updated_at" | "change_log" | "none";
};

export type IncrementalExportResult = {
  entities: Record<string, IncrementalEntityResult>;
  changes: Record<string, { modified: number; deleted: number }>;
  total_changes: number;
  warnings: string[];
  errors: string[];
  database_export: "complete" | "partial" | "failed";
  coverage: "complete" | "partial";
};

async function fetchModifiedRows(
  entity: BackupEntityDefinition,
  empresaId: number | null,
  from: Date,
  to: Date,
): Promise<{ rows: Record<string, unknown>[]; via: "updated_at" | "none" }> {
  try {
    const db = backupDb();

    // Attempt query with updated_at filter
    const baseQuery = db
      .from(entity.table)
      .select("*")
      .gte("updated_at", from.toISOString())
      .lte("updated_at", to.toISOString());

    const filteredQuery = entity.companyField && empresaId
      ? (baseQuery as unknown as { eq: (c: string, v: unknown) => typeof baseQuery }).eq(entity.companyField, empresaId)
      : baseQuery;

    const { data, error } = await (filteredQuery as unknown as Promise<{ data: unknown; error: unknown }>);

    if (error) {
      // Table may not have updated_at — return empty with flag
      return { rows: [], via: "none" };
    }

    return { rows: (data as Record<string, unknown>[] | null) ?? [], via: "updated_at" };
  } catch {
    return { rows: [], via: "none" };
  }
}

async function exportIncrementalEntity(
  entity: BackupEntityDefinition,
  empresaId: number | null,
  backupRunId: string,
  from: Date,
  to: Date,
  changeLogs: ChangeLogRow[],
): Promise<IncrementalEntityResult> {
  const filePath = `incremental/${entity.key}.jsonl.gz`;

  try {
    const { rows: modifiedRows, via } = await fetchModifiedRows(entity, empresaId, from, to);

    // Get deletions from change log for this entity
    const deletedLogs = changeLogs.filter(
      (c) => c.entity_type === entity.key && (c.operation === "deleted" || c.operation === "file_deleted"),
    );

    if (modifiedRows.length === 0 && deletedLogs.length === 0) {
      return {
        entityKey: entity.key,
        modified: 0,
        deleted: 0,
        file: filePath,
        checksum: "",
        size_bytes: 0,
        status: "skipped",
        detected_via: via,
      };
    }

    const allRedact = [...(entity.redactFields ?? []), ...SENSITIVE_BACKUP_FIELDS.filter((f) => !entity.redactFields?.includes(f))];

    const lines: string[] = [];

    // Modified / created rows
    for (const row of modifiedRows) {
      const sanitized = redactSensitiveFields(row, allRedact);
      lines.push(JSON.stringify({ _op: "modified", _entity: entity.key, ...sanitized }));
    }

    // Tombstones for deletions
    for (const log of deletedLogs) {
      lines.push(JSON.stringify({
        _op: "deleted",
        _entity: entity.key,
        _id: log.record_id ?? log.entity_id,
        _changed_at: log.changed_at,
      }));
    }

    const jsonl = lines.join("\n");
    const compressed = zlib.gzipSync(Buffer.from(jsonl, "utf-8"));
    const checksum = crypto.createHash("sha256").update(compressed).digest("hex");

    await uploadBackupFile(empresaId, backupRunId, filePath, compressed, "application/gzip");

    return {
      entityKey: entity.key,
      modified: modifiedRows.length,
      deleted: deletedLogs.length,
      file: filePath,
      checksum,
      size_bytes: compressed.length,
      status: "exported",
      detected_via: via,
    };
  } catch (err) {
    return {
      entityKey: entity.key,
      modified: 0,
      deleted: 0,
      file: filePath,
      checksum: "",
      size_bytes: 0,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      detected_via: "none",
    };
  }
}

export async function exportIncrementalEntities(
  empresaId: number | null,
  backupRunId: string,
  entities: BackupEntityDefinition[],
  from: Date,
  to: Date,
  changeLogs: ChangeLogRow[],
): Promise<IncrementalExportResult> {
  const result: IncrementalExportResult = {
    entities: {},
    changes: {},
    total_changes: 0,
    warnings: [],
    errors: [],
    database_export: "complete",
    coverage: "complete",
  };

  let hasNoDetection = false;
  let hasCriticalFailure = false;
  let hasAnyFailure = false;

  for (const entity of entities) {
    const r = await exportIncrementalEntity(entity, empresaId, backupRunId, from, to, changeLogs);
    result.entities[r.entityKey] = r;

    if (r.status === "exported") {
      result.changes[r.entityKey] = { modified: r.modified, deleted: r.deleted };
      result.total_changes += r.modified + r.deleted;
    } else if (r.status === "failed") {
      hasAnyFailure = true;
      if (entity.priority === "critical") hasCriticalFailure = true;
      const msg = `${entity.label} (${entity.table}): ${r.error}`;
      if (entity.priority === "critical") {
        result.errors.push(`[CRITICO] ${msg}`);
      } else {
        result.warnings.push(`[ADVERTENCIA] ${msg}`);
      }
    } else if (r.detected_via === "none" && r.status === "skipped") {
      hasNoDetection = true;
      result.warnings.push(`${entity.label}: sin columna updated_at — cambios no detectables automaticamente.`);
    }
  }

  if (hasCriticalFailure) result.database_export = "failed";
  else if (hasAnyFailure) result.database_export = "partial";

  if (hasNoDetection) result.coverage = "partial";

  return result;
}
