export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export const JOB_STATUS = {
  PENDING: "pending" as const,
  PROCESSING: "processing" as const,
  COMPLETED: "completed" as const,
  FAILED: "failed" as const,
  CANCELLED: "cancelled" as const,
} satisfies Record<string, JobStatus>;

export type JobRecord<T = unknown> = {
  id: string;
  empresa_id: number | null;
  created_by: number | null;
  type: string;
  payload: T;
  status: JobStatus;
  priority: number;
  max_attempts: number;
  attempts: number;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  error_message: string | null;
  error_stack: string | null;
  result: unknown | null;
  created_at: string;
  updated_at: string;
};

export type CreateJobInput<T = unknown> = {
  type: string;
  payload: T;
  empresa_id?: number | null;
  created_by?: number | null;
  priority?: number;
  max_attempts?: number;
  scheduled_for?: string | Date | null;
};

export type JobLogEntry = {
  id: string;
  job_id: string;
  attempt: number;
  level: string;
  message: string;
  metadata: unknown | null;
  duration_ms: number | null;
  created_at: string;
};

export type JobLogger = {
  info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  warn: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
};

export type JobHandler<T = unknown> = {
  type: string;
  displayName: string;
  description: string;
  handle: (job: JobRecord<T>, logger: JobLogger) => Promise<void>;
};

export type JobScheduleDefinition = {
  jobType: string;
  cronExpression: string;
  payload?: Record<string, unknown>;
  description?: string;
};

export type ProcessResult = {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ jobId: string; type: string; error: string }>;
};

export type WorkerConfig = {
  limit?: number;
};
