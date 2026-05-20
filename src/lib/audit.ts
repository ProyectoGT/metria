import { createAdminClient } from "@/lib/supabase-admin";
import type { TablesInsert } from "@/types/database.types";

const SENSITIVE_FIELDS = new Set([
  "password_hash", "password", "secret", "token", "auth_id",
  "access_token", "refresh_token", "encrypted_key",
]);

type AuditInput = {
  actorId: number;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  empresaId?: number | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

function sanitize(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!data) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(key) || key.endsWith("_token") || key.endsWith("_secret")) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

function diff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): { before: Record<string, unknown> | null; after: Record<string, unknown> | null } {
  const b = sanitize(before);
  const a = sanitize(after);
  if (!b || !a) return { before: b, after: a };

  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};

  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (key === "updated_at" || key === "created_at" || key === "archived_at") continue;
    const bv = b[key];
    const av = a[key];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      changedBefore[key] = bv;
      changedAfter[key] = av;
    }
  }

  return {
    before: Object.keys(changedBefore).length > 0 ? changedBefore : null,
    after: Object.keys(changedAfter).length > 0 ? changedAfter : null,
  };
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const supabase = createAdminClient();
  const sanitized = sanitize(input.after ?? undefined);
  const previous = sanitize(input.before ?? undefined);

  const { before, after } = previous && sanitized
    ? diff(previous, sanitized)
    : { before: previous, after: sanitized };

  await supabase.from("audit_log").insert({
    empresa_id: input.empresaId ?? null,
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId != null ? String(input.entityId) : null,
    before: before as never,
    after: after as never,
    metadata: input.metadata ? (JSON.parse(JSON.stringify(input.metadata)) as never) : null,
  } as TablesInsert<"audit_log">);
}

export async function recordAuditCreate(
  actorId: number,
  entityType: string,
  entityId: string | number,
  after: Record<string, unknown>,
  options?: { empresaId?: number | null; metadata?: Record<string, unknown> | null },
): Promise<void> {
  await recordAudit({
    actorId,
    action: `${entityType}.creada`,
    entityType,
    entityId,
    empresaId: options?.empresaId,
    after,
    metadata: options?.metadata,
  });
}

export async function recordAuditUpdate(
  actorId: number,
  entityType: string,
  entityId: string | number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  options?: { empresaId?: number | null; metadata?: Record<string, unknown> | null },
): Promise<void> {
  await recordAudit({
    actorId,
    action: `${entityType}.editada`,
    entityType,
    entityId,
    empresaId: options?.empresaId,
    before,
    after,
    metadata: options?.metadata,
  });
}

export async function recordAuditDelete(
  actorId: number,
  entityType: string,
  entityId: string | number,
  snapshot?: Record<string, unknown>,
  options?: { empresaId?: number | null; metadata?: Record<string, unknown> | null },
): Promise<void> {
  await recordAudit({
    actorId,
    action: `${entityType}.eliminada`,
    entityType,
    entityId,
    empresaId: options?.empresaId,
    before: snapshot,
    metadata: options?.metadata,
  });
}

export type { AuditInput };
