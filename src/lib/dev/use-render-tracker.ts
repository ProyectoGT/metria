"use client";

import { useEffect, useRef } from "react";

/**
 * Dev-only render tracker. Logs render count and time between renders.
 * Produces zero overhead in production (the entire module is excluded
 * from production builds because all callers guard with NODE_ENV).
 *
 * Usage:
 *   if (process.env.NODE_ENV === "development") {
 *     // eslint-disable-next-line react-hooks/rules-of-hooks
 *     useRenderTracker("KanbanBoard");
 *   }
 */
export function useRenderTracker(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  renderCount.current += 1;

  const now = performance.now();
  const sinceLastRender = (now - lastRenderTime.current).toFixed(1);
  lastRenderTime.current = now;

  const count = renderCount.current;

  useEffect(() => {
    if (count === 1) {
      console.debug(
        `%c[PERF] ${componentName} — mount`,
        "color: #6366f1; font-weight: bold",
      );
    } else {
      const marker = sinceLastRender < "50" ? "🟡" : "🔴";
      console.debug(
        `%c[PERF] ${componentName} — render #${count} (+${sinceLastRender}ms since last)`,
        `color: ${Number(sinceLastRender) > 50 ? "#ef4444" : "#f59e0b"}; font-weight: bold`,
        marker,
      );
    }
  });
}
