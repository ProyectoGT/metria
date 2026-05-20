"use client";

import { useEffect, useRef } from "react";

/**
 * Dev-only render tracker. Logs commit count and time between commits.
 * It keeps render pure: timers and ref updates happen after commit.
 */
export function useRenderTracker(componentName: string) {
  const renderCount = useRef(0);
  const lastCommitTime = useRef<number | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const now = performance.now();
    const previous = lastCommitTime.current;
    lastCommitTime.current = now;
    renderCount.current += 1;

    const count = renderCount.current;
    if (count === 1 || previous == null) {
      console.debug(
        `%c[PERF] ${componentName} mount`,
        "color: #6366f1; font-weight: bold",
      );
      return;
    }

    const sinceLastCommit = (now - previous).toFixed(1);
    console.debug(
      `%c[PERF] ${componentName} commit #${count} (+${sinceLastCommit}ms since last)`,
      `color: ${Number(sinceLastCommit) > 50 ? "#ef4444" : "#f59e0b"}; font-weight: bold`,
    );
  });
}
