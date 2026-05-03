"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Mail, RefreshCw, TriangleAlert, Unplug } from "lucide-react";

type Status = "connected" | "not_connected" | "sync_error" | "reauth_required" | "disconnected";

export default function EmailConnectionCard({
  email,
  status,
  lastSyncAt,
  lastError,
}: {
  email: string | null;
  status: Status;
  lastSyncAt: string | null;
  lastError: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(status);

  const connected = localStatus === "connected";
  const requiresAction = localStatus === "reauth_required" || localStatus === "sync_error";

  function disconnect() {
    startTransition(async () => {
      const res = await fetch("/api/email/gmail/disconnect", { method: "POST" });
      if (res.ok) setLocalStatus("disconnected");
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Correo conectado</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Sincroniza Gmail para trabajar emails, hilos y relaciones comerciales desde Metria.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Conectado
                </span>
              ) : requiresAction ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 font-medium text-danger">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  {localStatus === "reauth_required" ? "Requiere reautorizacion" : "Error de sincronizacion"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2.5 py-1 font-medium text-text-secondary">
                  No conectado
                </span>
              )}
              {email && <span className="text-text-secondary">{email}</span>}
              {lastSyncAt && (
                <span className="text-text-secondary">
                  Ultima sync {new Date(lastSyncAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                </span>
              )}
            </div>
            {lastError && (
              <p className="mt-2 max-w-xl text-xs text-danger">{lastError}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href="/api/email/gmail/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            <RefreshCw className="h-4 w-4" />
            {connected ? "Reautorizar Gmail" : "Conectar Gmail"}
          </a>
          {connected && (
            <button
              type="button"
              onClick={disconnect}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-60"
            >
              <Unplug className="h-4 w-4" />
              Desconectar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
