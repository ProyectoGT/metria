"use client";

import ErrorFallback from "@/components/ui/error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <ErrorFallback
          error={error}
          onRetry={reset}
          fullPage
          title="Error critico"
          description="Ocurrio un error grave en la aplicacion. Puedes intentar recargar la pagina."
        />
      </body>
    </html>
  );
}
