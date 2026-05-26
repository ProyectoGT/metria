import { createAdminClient } from "@/lib/supabase-admin";

type DbError = { message: string } | null;
export type DbResult<T = unknown> = { data: T | null; error: DbError; count?: number | null };

type BackupQuery<T = unknown> = PromiseLike<DbResult<T>> & {
  select: (columns?: string, options?: Record<string, unknown>) => BackupQuery<T>;
  insert: (values: unknown) => BackupQuery<T>;
  upsert: (values: unknown, options?: Record<string, unknown>) => BackupQuery<T>;
  update: (values: unknown) => BackupQuery<T>;
  delete: () => BackupQuery<T>;
  eq: (column: string, value: unknown) => BackupQuery<T>;
  neq: (column: string, value: unknown) => BackupQuery<T>;
  in: (column: string, values: unknown[]) => BackupQuery<T>;
  not: (column: string, operator: string, value: unknown) => BackupQuery<T>;
  lte: (column: string, value: unknown) => BackupQuery<T>;
  gte: (column: string, value: unknown) => BackupQuery<T>;
  is: (column: string, value: unknown) => BackupQuery<T>;
  order: (column: string, options?: Record<string, unknown>) => BackupQuery<T>;
  limit: (count: number) => BackupQuery<T>;
  maybeSingle: () => BackupQuery<T>;
  single: () => BackupQuery<T>;
};

type BackupDbClient = {
  from: <T = unknown>(table: string) => BackupQuery<T>;
};

export function backupDb(): BackupDbClient {
  return createAdminClient() as unknown as BackupDbClient;
}
