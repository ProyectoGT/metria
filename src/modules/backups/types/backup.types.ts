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

export type BackupEntityDefinition = {
  key: string;
  table: string;
  label: string;
  scope: BackupEntityScope;
  enabled: boolean;
  sensitive?: boolean;
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
  error_message: string | null;
  verified_at: string | null;
  locked_at?: string | null;
  locked_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type BackupProfile = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  backup_type: BackupType;
  schedule_type: "hourly" | "every_x_hours" | "daily" | "weekly" | "monthly" | "custom";
  schedule_config: Record<string, unknown>;
  timezone: string;
  scope: BackupScopeKey[];
  retention_policy: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

export type BackupManifest = {
  backup_id: string;
  type: BackupType;
  status: "verified" | "failed" | "pending";
  created_at: string;
  created_by: string;
  app_version: string;
  schema_version: string;
  scope: BackupScopeKey[];
  tables: Record<string, BackupManifestTable>;
  storage: {
    buckets: number;
    objects: number;
    total_size: number;
    checksum_status: "pending" | "verified" | "not_available";
  };
  parent_backup_id: string | null;
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
