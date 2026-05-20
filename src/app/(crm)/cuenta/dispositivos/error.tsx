"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function MisDispositivosError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-danger/20 bg-surface p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold text-text-primary">
        No se pudieron cargar tus dispositivos
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        Intenta recargar la vista. Si el problema continua, revisa la configuracion de seguridad.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
      >
        <RotateCcw className="h-4 w-4" />
        Reintentar
      </button>
    </div>
  );
}

