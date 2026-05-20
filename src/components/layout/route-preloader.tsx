"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FREQUENT_ROUTES = ["/dashboard", "/calendario", "/ordenes", "/propiedades"] as const;

export default function RoutePreloader() {
  const router = useRouter();

  useEffect(() => {
    const run = () => {
      for (const route of FREQUENT_ROUTES) router.prefetch(route);
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const id = globalThis.setTimeout(run, 600);
    return () => globalThis.clearTimeout(id);
  }, [router]);

  return null;
}
