"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/ui/error-fallback";
import { logError } from "@/lib/observability";

export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("crm", "Error en seccion CRM", error, { digest: error.digest });
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      onRetry={reset}
      title="Error en el CRM"
      description="No pudimos cargar esta seccion. Prueba a recargar o vuelve al inicio."
    />
  );
}
