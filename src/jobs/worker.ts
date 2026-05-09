import { createAdminClient } from "@/lib/supabase-admin";
import { getJobHandler } from "./registry";
import type { JobRecord, JobLogger, ProcessResult, WorkerConfig } from "./types";

function logs() {
  return createAdminClient().from("job_logs");
}

function jobs() {
  return createAdminClient().from("jobs");
}

function createJobLogger(jobId: string, attempt: number): JobLogger {
  async function log(level: string, message: string, metadata?: Record<string, unknown>) {
    await logs().insert({
      job_id: jobId,
      attempt,
      level,
      message,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    });
  }

  return {
    info: (msg, meta?) => log("info", msg, meta),
    warn: (msg, meta?) => log("warn", msg, meta),
    error: (msg, meta?) => log("error", msg, meta),
  };
}

async function claimNextJob(): Promise<JobRecord | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("claim_next_job");

  if (error) {
    console.error("[worker] claim_next_job RPC error:", error.message);
    return null;
  }

  return data as unknown as JobRecord | null;
}

async function completeJob(jobId: string, result: unknown): Promise<void> {
  await jobs()
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result: result ? JSON.parse(JSON.stringify(result)) : null,
    })
    .eq("id", jobId);
}

async function failJob(jobId: string, errorMessage: string, errorStack?: string): Promise<void> {
  const { data: job } = await jobs()
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  const attempts = (job as { attempts: number; max_attempts: number } | null)?.attempts ?? 1;
  const maxAttempts = (job as { attempts: number; max_attempts: number } | null)?.max_attempts ?? 3;

  if (attempts >= maxAttempts) {
    await jobs()
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: errorMessage,
        error_stack: errorStack ?? null,
      })
      .eq("id", jobId);
  } else {
    await jobs()
      .update({
        status: "pending",
        started_at: null,
        error_message: errorMessage,
        error_stack: errorStack ?? null,
      })
      .eq("id", jobId);
  }
}

async function processSingleJob(job: JobRecord): Promise<{ succeeded: boolean; error?: string }> {
  const handler = getJobHandler(job.type);

  if (!handler) {
    const msg = `No hay handler registrado para el tipo "${job.type}"`;
    await failJob(job.id, msg);
    return { succeeded: false, error: msg };
  }

  const logger = createJobLogger(job.id, job.attempts);
  const start = Date.now();

  try {
    await logger.info(`Iniciando procesamiento (intento ${job.attempts}/${job.max_attempts})`);
    await handler.handle(job as JobRecord, logger);

    const duration = Date.now() - start;
    await logger.info("Job completado exitosamente", { duration_ms: duration });
    await completeJob(job.id, { duration_ms: duration });

    return { succeeded: true };
  } catch (err) {
    const duration = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    await logger.error(`Error: ${message}`, { duration_ms: duration, stack });
    await failJob(job.id, message, stack);

    return { succeeded: false, error: message };
  }
}

export async function processJobs(config: WorkerConfig = {}): Promise<ProcessResult> {
  const limit = config.limit ?? 5;
  const result: ProcessResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  for (let i = 0; i < limit; i++) {
    const job = await claimNextJob();
    if (!job) break;

    result.processed++;
    const outcome = await processSingleJob(job);

    if (outcome.succeeded) {
      result.succeeded++;
    } else {
      result.failed++;
      result.errors.push({ jobId: job.id, type: job.type, error: outcome.error ?? "unknown" });
    }
  }

  if (result.processed > 0) {
    console.log(
      `[worker] Procesados ${result.processed} jobs: ` +
      `${result.succeeded} ok, ${result.failed} errores`,
    );
  }

  return result;
}
