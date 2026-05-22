"use client";

import { useMemo } from "react";
import type { BackupRun } from "../types/backup.types";

export function useBackupRestore(runs: BackupRun[]) {
  return useMemo(() => ({
    restorableRuns: runs.filter((run) => run.status === "verified"),
    hasRestorableRun: runs.some((run) => run.status === "verified"),
  }), [runs]);
}
