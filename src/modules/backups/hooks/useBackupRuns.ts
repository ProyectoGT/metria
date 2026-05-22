"use client";

import { useMemo } from "react";
import type { BackupRun } from "../types/backup.types";

export function useBackupRuns(runs: BackupRun[]) {
  return useMemo(() => ({
    runs,
    verifiedRuns: runs.filter((run) => run.status === "verified"),
    failedRuns: runs.filter((run) => run.status === "failed"),
    queuedRuns: runs.filter((run) => run.status === "queued"),
  }), [runs]);
}
