import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase";
import type { CreateJobInput, JobRecord } from "./types";

function db() {
  return createAdminClient().from("jobs");
}

type EnqueueOptions = {
  useAdmin?: boolean;
};

async function getDb(useAdmin: boolean) {
  if (useAdmin) {
    return createAdminClient().from("jobs");
  }
  return (await createClient()).from("jobs");
}

export async function enqueueJob<T = unknown>(
  input: CreateJobInput<T>,
  options: EnqueueOptions = {},
): Promise<JobRecord<T>> {
  const jobs = await getDb(options.useAdmin ?? false);

  const payload = JSON.parse(JSON.stringify(input.payload));

  const { data, error } = await jobs
    .insert({
      type: input.type,
      payload,
      empresa_id: input.empresa_id ?? null,
      created_by: input.created_by ?? null,
      priority: input.priority ?? 0,
      max_attempts: input.max_attempts ?? 3,
      scheduled_for: input.scheduled_for
        ? new Date(input.scheduled_for).toISOString()
        : null,
    })
    .select()
    .single();

  if (error) throw new Error(`Error al encolar job: ${error.message}`);
  return data as unknown as JobRecord<T>;
}

export async function enqueueJobBulk<T = unknown>(
  inputs: CreateJobInput<T>[],
  options: EnqueueOptions = {},
): Promise<JobRecord<T>[]> {
  const jobs = await getDb(options.useAdmin ?? false);

  const records = inputs.map((input) => ({
    type: input.type,
    payload: JSON.parse(JSON.stringify(input.payload)),
    empresa_id: input.empresa_id ?? null,
    created_by: input.created_by ?? null,
    priority: input.priority ?? 0,
    max_attempts: input.max_attempts ?? 3,
    scheduled_for: input.scheduled_for
      ? new Date(input.scheduled_for).toISOString()
      : null,
  }));

  const { data, error } = await jobs.insert(records).select();

  if (error) throw new Error(`Error al encolar jobs: ${error.message}`);
  return (data ?? []) as unknown as JobRecord<T>[];
}

export async function cancelJob(jobId: string): Promise<void> {
  const { error } = await db()
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) throw new Error(`Error al cancelar job: ${error.message}`);
}

export async function getJob<T = unknown>(jobId: string): Promise<JobRecord<T> | null> {
  const { data, error } = await db()
    .select()
    .eq("id", jobId)
    .single();

  if (error) return null;
  return data as unknown as JobRecord<T>;
}

export async function listPendingJobs(type?: string): Promise<JobRecord[]> {
  let q = db()
    .select()
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (type) {
    q = q.eq("type", type);
  }

  const { data, error } = await q;
  if (error) throw new Error(`Error al listar jobs: ${error.message}`);
  return (data ?? []) as unknown as JobRecord[];
}
