"use client";

import { useMemo } from "react";
import type { BackupAuditEvent } from "../types/backup.types";

export function useBackupAudit(events: BackupAuditEvent[]) {
  return useMemo(() => ({
    events,
    criticalEvents: events.filter((event) => event.event_type.includes("restore") || event.event_type.includes("download")),
  }), [events]);
}
