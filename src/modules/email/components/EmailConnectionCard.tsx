"use client";

import { useState, useTransition } from "react";
import {
  Mail,
  CheckCircle2,
  RefreshCw,
  Unplug,
  Clock,
  Plug,
  AlertCircle,
} from "lucide-react";
import Badge from "@/components/ui/badge";

type Status =
  | "connected"
  | "not_connected"
  | "sync_error"
  | "reauth_required"
  | "disconnected";

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

  const notConnected =
    localStatus === "not_connected" || localStatus === "disconnected";

  function disconnect() {
    startTransition(async () => {
      const res = await fetch("/api/email/gmail/disconnect", {
        method: "POST",
      });
      if (res.ok) setLocalStatus("disconnected");
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Correo conectado
            </h2>
            <p className="text-xs text-text-secondary">
              Sincroniza Gmail con Metria
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {notConnected ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Plug className="h-6 w-6 text-text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Ninguna cuenta conectada
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Conecta tu Gmail para gestionar emails desde Metria
              </p>
            </div>
            <a
              href="/api/email/gmail/auth"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark"
            >
              <Mail className="h-4 w-4" />
              Conectar Gmail
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <Mail className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {email ?? "Gmail conectado"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="mr-0.5 h-3 w-3" />
                      Conectado
                    </Badge>
                    <span className="text-xs text-text-secondary">Gmail</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/email/gmail/auth"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary shadow-sm transition-colors hover:bg-background"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reautorizar
                </a>
                <button
                  type="button"
                  onClick={disconnect}
                  disabled={isPending}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm transition-colors hover:border-danger/30 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  Desconectar
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-background px-4 py-3">
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Ultima sincronizacion:{" "}
                    {lastSyncAt
                      ? new Date(lastSyncAt).toLocaleString("es-ES", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "Pendiente"}
                  </span>
                </div>
                {lastError && (
                  <div className="flex items-start gap-2 text-danger">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{lastError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
