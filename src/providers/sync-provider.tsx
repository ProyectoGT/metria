"use client";

import { type ReactNode } from "react";
import { useSyncEngine } from "@/hooks/use-sync-engine";

/**
 * Mounts the sync engine. Must be a child of QueryProvider.
 * Renders nothing — purely a side-effect component.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  useSyncEngine();
  return <>{children}</>;
}
