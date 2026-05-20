"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  setObservabilityRoute,
  setupGlobalErrorListeners,
  perf,
  logInfo,
} from "@/lib/observability";

type ObservabilityProviderProps = {
  children: React.ReactNode;
};

export default function ObservabilityProvider({ children }: ObservabilityProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);
  const prevPath = useRef(pathname);

  // Setup on mount: global error listeners + initial load perf
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setupGlobalErrorListeners();

    // Initial page load performance
    if (performance.timing) {
      const navStart = performance.timing.navigationStart;
      const domReady = performance.timing.domContentLoadedEventEnd;
      const loadEnd = performance.timing.loadEventEnd;
      if (domReady && navStart) {
        perf.measure("pagina_carga_inicial", domReady - navStart);
      }
      if (loadEnd && navStart) {
        perf.measure("pagina_carga_completa", loadEnd - navStart);
      }
    }

    // Use PerformanceObserver for LCP if available
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lcp = entries[entries.length - 1];
          perf.measure("lcp", lcp.startTime);
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch { /* not supported */ }

    logInfo("observability", "Observabilidad iniciada", { path: pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track route changes
  useEffect(() => {
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    setObservabilityRoute(url);

    if (prevPath.current !== pathname) {
      perf.measure("navegacion", 0); // marca la navegación
      logInfo("navigation", `Ruta: ${url}`, { from: prevPath.current, to: pathname });
      prevPath.current = pathname;
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
