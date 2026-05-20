"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initSyncEngine } from "@/lib/sync-engine";

/**
 * Mounts the sync engine for the lifetime of the CRM layout.
 *
 * Call this once at the top of the component tree (CRM layout).
 * The engine subscribes to the event bus and keeps all TanStack Query
 * caches in sync whenever a mutation emits a CRM event.
 */
export function useSyncEngine() {
  const qc = useQueryClient();

  useEffect(() => {
    const cleanup = initSyncEngine(qc);
    return cleanup;
  }, [qc]);
}
