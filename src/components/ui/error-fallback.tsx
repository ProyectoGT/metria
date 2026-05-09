"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type ErrorFallbackProps = {
  error?: Error | null;
  onRetry?: () => void;
  fullPage?: boolean;
  title?: string;
  description?: string;
};

export default function ErrorFallback({
  error,
  onRetry,
  fullPage = false,
  title = "Algo salio mal",
  description = "Ocurrio un error inesperado. Nuestro equipo ha sido notificado.",
}: ErrorFallbackProps) {
  const content = (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
        <AlertTriangle className="h-7 w-7 text-danger" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-text-secondary">{description}</p>
      {process.env.NODE_ENV === "development" && error && (
        <details className="mt-4 w-full max-w-md rounded-xl border border-border bg-muted p-3 text-left">
          <summary className="cursor-pointer text-xs font-medium text-text-secondary">
            Detalles tecnicos
          </summary>
          <pre className="mt-2 overflow-auto text-xs text-text-secondary/70">
            {error.name}: {error.message}
            {error.stack && `\n${error.stack}`}
          </pre>
        </details>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-sm">
        {content}
      </div>
    </div>
  );
}
