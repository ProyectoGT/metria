export type BackupType = "full" | "incremental";

export type BackupRunStatus =
  | "queued"
  | "running"
  | "exporting_database"
  | "exporting_storage"
  | "compressing"
  | "encrypting"
  | "uploading"
  | "verifying"
  | "verified"
  | "failed"
  | "expired"
  | "locked"
  | "cancelled";

export type BackupDestinationType =
  | "supabase_storage"
  | "s3"
  | "local_download"
  | "external_provider";

export type BackupScopeKey =
  | "all"
  | "database"
  | "storage"
  | "settings"
  | "users"
  | "contacts"
  | "properties"
  | "tasks_calendar"
  | "documents"
  | "communications"
  | "audit"
  | "automations"
  | "templates";

export type BackupVerificationLevel = "basic" | "complete" | "restore_simulation";

export type BackupEntityScope =
  | "security"
  | "crm"
  | "activity"
  | "documents"
  | "communications"
  | "support"
  | "audit"
  | "jobs"
  | "settings";

export type BackupEntityPriority = "critical" | "important" | "optional" | "excluded";

export type BackupEntityDefinition = {
  key: string;
  table: string;
  label: string;
  scope: BackupEntityScope;
  enabled: boolean;
  sensitive?: boolean;
  priority?: BackupEntityPriority;
  companyField?: string | null;
  orderBy?: string;
  excludeFields?: string[];
  redactFields?: string[];
};

export type BackupDestinationConfig = {
  type: BackupDestinationType;
  label: string;
  comingSoon?: boolean;
  encrypted?: boolean;
};

export type BackupRun = {
  id: string;
  empresa_id: number | null;
  profile_id: string | null;
  backup_type: BackupType;
  status: BackupRunStatus;
  triggered_mode: "manual" | "scheduled" | "retry" | "system";
  triggered_by: number | null;
  scope: BackupScopeKey[];
  destination_primary: BackupDestinationConfig | Record<string, unknown>;
  destination_secondary: BackupDestinationConfig | Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  size_bytes: number | null;
  manifest_path: string | null;
  manifest: BackupManifest | null;
  checksum: string | null;
  parent_backup_id: string | null;
  base_full_backup_id: string | null;
  error_message: string | null;
  verified_at: string | null;
  locked_at?: string | null;
  locked_by?: number | null;
  locked_reason?: string | null;
  expired_at?: string | null;
  expired_by?: number | null;
  expiration_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type BackupScheduleType = "hourly" | "every_x_hours" | "daily" | "weekly" | "monthly" | "custom";

export type BackupProfile = {
  id: string;
  empresa_id: number | null;
  name: string;
  description: string | null;
  enabled: boolean;
  backup_type: BackupType;
  schedule_type: BackupScheduleType;
  schedule_config: Record<string, unknown>;
  timezone: string;
  scope: BackupScopeKey[];
  destination_primary: Record<string, unknown>;
  destination_secondary: Record<string, unknown> | null;
  retention_policy: Record<string, unknown>;
  notify_on_success: boolean;
  notify_on_failure: boolean;
  notify_admins: boolean;
  notify_directors: boolean;
  max_retries: number;
  retry_delay_minutes: number;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
};

// ── Restore types ─────────────────────────────────────────────────────────

export type RestoreRunStatus =
  | "requested"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "dry_running"
  | "ready"
  | "restoring"
  | "completed"
  | "failed"
  | "cancelled";

export type EntityImpact = {
  entity_key: string;
  table: string;
  backup_rows: number;
  current_rows: number;
  modified_since_backup: number;
  estimated_conflicts: number;
  backup_status: "exported" | "failed" | "skipped";
  change_detection: "available" | "unavailable";
};

export type DryRunValidation = {
  check: string;
  status: "passed" | "failed" | "warning";
  message: string;
};

export type DryRunReport = {
  backup_id: string;
  backup_verified_at: string | null;
  backup_type: BackupType;
  backup_phase: "logical_manifest" | "data_export";
  validations: DryRunValidation[];
  chain_valid: boolean;
  chain_error?: string;
  schema_compatible: boolean;
  storage_available: boolean;
  entities: Record<string, EntityImpact>;
  total_backup_rows: number;
  total_current_rows: number;
  total_estimated_conflicts: number;
  storage_objects_in_backup: number;
  restore_type: "simulation_only";
  production_safe: false;
  warnings: string[];
  conflicts: string[];
  recommendation: string;
  computed_at: string;
};

export type RestoreRun = {
  id: string;
  empresa_id: number | null;
  backup_run_id: string;
  status: RestoreRunStatus;
  restore_type: string;
  target: Record<string, unknown>;
  requested_by: number | null;
  approved_by: number | null;
  started_at: string | null;
  finished_at: string | null;
  dry_run_result: DryRunReport | null;
  pre_restore_backup_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type RetentionPolicy = {
  incrementals_days: number;
  daily_full_days: number;
  weekly_full_weeks: number;
  monthly_full_months: number;
  annual_full_years: number;
  keep_min_copies: number;
};

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  incrementals_days: 30,
  daily_full_days: 30,
  weekly_full_weeks: 12,
  monthly_full_months: 12,
  annual_full_years: 7,
  keep_min_copies: 3,
};

export type RetentionCandidate = {
  run: BackupRun;
  protected: boolean;
  protectionReason?: string;
  expirationReason?: string;
  ageHours: number;
};

export type RetentionCleanupResult = {
  dry_run: boolean;
  candidates: RetentionCandidate[];
  protected_count: number;
  expired_count: number;
  already_expired_count: number;
  errors: string[];
  ran_at: string;
};

export type BackupProfileInput = {
  name: string;
  description?: string;
  backup_type: BackupType;
  schedule_type: BackupScheduleType;
  schedule_config: Record<string, unknown>;
  timezone: string;
  scope: BackupScopeKey[];
  notify_on_success: boolean;
  notify_on_failure: boolean;
  notify_admins: boolean;
  notify_directors: boolean;
  max_retries: number;
  retry_delay_minutes: number;
};

export type BackupAuditEvent = {
  id: string;
  event_type: string;
  backup_run_id: string | null;
  profile_id: string | null;
  restore_run_id: string | null;
  user_id: number | null;
  user_role: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type BackupManifestTable = {
  rows: number;
  checksum: string;
};

export type BackupManifestEntity = {
  table: string;
  rows: number;
  file: string;
  checksum: string;
  size_bytes: number;
  status: "exported" | "failed" | "skipped";
  priority: "critical" | "important" | "optional" | "excluded";
  redacted_fields?: string[];
  error?: string;
};

export type StorageObjectBackup = {
  path: string;
  backup_path: string;
  size_bytes: number;
  content_type: string;
  checksum: string;
  status: "copied" | "failed" | "skipped";
  error?: string;
};

export type StorageBucketBackupResult = {
  bucket: string;
  label: string;
  total_objects: number;
  copied_objects: number;
  failed_objects: number;
  total_size_bytes: number;
  status: "complete" | "partial" | "failed" | "empty";
  objects: StorageObjectBackup[];
};

export type BackupManifest = {
  backup_id: string;
  empresa_id?: string | number;
  type: BackupType;
  phase: "logical_manifest" | "data_export";
  status: "verified" | "failed" | "pending";
  created_at: string;
  created_by: string;
  app_version: string;
  schema_version: string;
  scope: BackupScopeKey[];
  // Fase 3+: exportacion real por entidad
  entities: Record<string, BackupManifestEntity>;
  // Compatibilidad con Fase 1
  tables: Record<string, BackupManifestTable>;
  storage: {
    buckets: number;
    objects: number;
    total_size: number;
    checksum_status: "pending" | "verified" | "not_available";
    bucket_details?: Record<string, StorageBucketBackupResult>;
  };
  database_export: "complete" | "partial" | "failed" | "pending";
  storage_export: "pending" | "partial" | "complete" | "empty" | "failed";
  restore_status: "simulation_only";
  warnings: string[];
  errors: string[];
  parent_backup_id: string | null;
  base_full_backup_id?: string | null;
  // Incremental fields
  from?: string | null;
  to?: string | null;
  chain_valid?: boolean;
  coverage?: "complete" | "partial";
  changes?: Record<string, { modified: number; deleted: number }>;
  encryption: "prepared" | "enabled";
  verified_at: string | null;
};

export type BackupHealth = {
  status: "protected" | "attention" | "critical";
  lastSuccessfulRun: BackupRun | null;
  lastFailedRun: BackupRun | null;
  nextScheduledRun: string | null;
  availableCopies: number;
  totalSizeBytes: number;
  primaryDestinationStatus: "healthy" | "pending" | "warning";
  secondaryDestinationStatus: "healthy" | "pending" | "warning";
  verificationStatus: "passed" | "pending" | "failed";
  openAlerts: Array<{
    level: "info" | "warning" | "critical";
    message: string;
    action: string;
    date: string;
  }>;
  averageDurationMs: number | null;
  estimatedRestoreMs: number | null;
  rpo: string;
  rto: string;
};

export type ManualBackupInput = {
  backupType: BackupType;
  scope: BackupScopeKey[];
  destination: BackupDestinationType;
  verificationLevel: BackupVerificationLevel;
  notifyCreator: boolean;
  notifyAdmins: boolean;
  notifyDirectors: boolean;
  notifyMode: "always" | "failure_only";
  confirmationText: string;
};
