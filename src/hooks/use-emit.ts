"use client";

import { useCallback } from "react";
import { eventBus } from "@/lib/event-bus";
import type { CRMEvent } from "@/lib/events";

/**
 * Returns a stable `emit` function bound to the global event bus.
 *
 * Usage:
 *   const emit = useEmit();
 *   emit({ type: "task.created", payload: { tareaId: 1, empresaId: 2 } });
 *
 * The function is memoized — safe to put in dependency arrays.
 */
export function useEmit() {
  return useCallback(<E extends CRMEvent>(event: E) => {
    eventBus.emit(event);
  }, []);
}
