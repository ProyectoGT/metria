"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Eye, GitBranch, Lock, RotateCcw, Unlock } from "lucide-react";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Drawer from "@/components/ui/drawer";
import EmptyState from "@/components/ui/empty-state";
import { Table, TableBody, TableContainer, TableHead, Td, Th, Tr } from "@/components/ui/table";
import type { BackupRun } from "../types/backup.types";
import {
  backupStatusLabel,
  backupStatusVariant,
  backupTypeLabel,
  formatBytes,
  formatDateTime,
  formatDuration,
} from "../utils/backupFormatters";
import BackupRunDetails from "./BackupRunDetails";
import { lockBackupAction, requestRestoreSimulationAction, unlockBackupAction } from "@/app/(crm)/backups/actions";
import { useToast } from "@/components/ui/toast";

type Props = { runs: BackupRun[]; canManage?: boolean };

export default function BackupHistoryTable({ runs, canManage = false }: Props) {
  const { toast } = useToast();
  const [selectedRun, setSelectedRun] = useState<BackupRun | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lockTarget, setLockTarget] = useState<string | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function requestRestore(run: BackupRun) {
    setMessage(null);
    startTransition(async () => {
      const result = await requestRestoreSimulationAction(run.id);
      setMessage(result.message);
    });
  }

  function handleLock(runId: string) {
    if (!lockReason.trim()) { toast("Escribe un motivo para el bloqueo.", "error"); return; }
    startTransition(async () => {
      const result = await lockBackupAction(runId, lockReason);
      setLockTarget(null);
      setLockReason("");
      if (result.ok) toast(result.message);
      else toast(result.message, "error");
    });
  }

  function handleUnlock(runId: string) {
    startTransition(async () => {
      const result = await unlockBackupAction(runId);
      if (result.ok) toast(result.message);
      else toast(result.message, "error");
    });
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        title="Todavia no hay copias"
        description="Crea una copia manual para empezar a proteger el sistema."
        icon={<RotateCcw className="h-8 w-8" />}
      />
    );
  }

  return (
    <>
      {message && (
        <p className="mb-3 rounded-lg bg-surface-raised px-4 py-3 text-sm text-text-secondary">
          {message}
        </p>
      )}
      <TableContainer>
        <Table>
          <TableHead>
            <Th>ID</Th>
            <Th>Fecha</Th>
            <Th>Tipo</Th>
            <Th>Estado</Th>
            <Th>BD</Th>
            <Th>Tamaño</Th>
            <Th>Duracion</Th>
            <Th align="right">Acciones</Th>
          </TableHead>
          <TableBody>
            {runs.map((run) => {
              const manifest = run.manifest;
              const isIncremental = run.backup_type === "incremental";
              const chainBroken = isIncremental && manifest?.chain_valid === false;
              const coveragePartial = isIncremental && manifest?.coverage === "partial";
              const dbExport = manifest?.database_export ?? "pending";

              return (
                <Tr key={run.id}>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs">{run.id.slice(0, 8)}</span>
                      {isIncremental && (
                        <span title="Incremental">
                          <GitBranch className="h-3.5 w-3.5 text-text-secondary" />
                        </span>
                      )}
                      {chainBroken && (
                        <span title="Cadena rota">
                          <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>{formatDateTime(run.created_at)}</Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <span>{backupTypeLabel(run.backup_type)}</span>
                      {isIncremental && manifest?.from && (
                        <span className="text-xs text-text-secondary">
                          desde {formatDateTime(manifest.from)}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={backupStatusVariant(run.status)}>
                      {backupStatusLabel(run.status)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={DB_EXPORT_VARIANT[dbExport] ?? "muted"}>
                      {DB_EXPORT_LABELS[dbExport] ?? dbExport}
                    </Badge>
                    {coveragePartial && (
                      <span className="ml-1 text-xs text-warning">parcial</span>
                    )}
                  </Td>
                  <Td>{formatBytes(run.size_bytes)}</Td>
                  <Td>{formatDuration(run.duration_ms)}</Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setSelectedRun(run)}>
                        Detalle
                      </Button>
                      {canManage && run.status === "locked" && (
                        <Button variant="outline" size="sm" icon={<Unlock className="h-3.5 w-3.5" />} disabled={isPending} onClick={() => handleUnlock(run.id)}>
                          Desbloquear
                        </Button>
                      )}
                      {canManage && run.status === "verified" && !chainBroken && (
                        <Button variant="outline" size="sm" icon={<Lock className="h-3.5 w-3.5" />} onClick={() => setLockTarget(run.id)}>
                          Bloquear
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={run.status !== "verified" || chainBroken || isPending}
                        onClick={() => requestRestore(run)}
                      >
                        Restaurar
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Drawer
        open={Boolean(selectedRun)}
        onClose={() => setSelectedRun(null)}
        title="Detalle de copia"
        subtitle={selectedRun ? selectedRun.id : undefined}
        width="lg"
      >
        {selectedRun && (
          <div className="space-y-5 p-5">
            {/* Info de cadena para incrementales */}
            {selectedRun.backup_type === "incremental" && (
              <div className="space-y-2 rounded-lg border border-border bg-surface px-4 py-3 text-xs">
                <p className="font-semibold text-text-primary">Cadena incremental</p>
                <p className="text-text-secondary">
                  Padre:{" "}
                  <span className="font-mono">{selectedRun.parent_backup_id?.slice(0, 16) ?? "—"}</span>
                </p>
                {selectedRun.base_full_backup_id && (
                  <p className="text-text-secondary">
                    Base full:{" "}
                    <span className="font-mono">{selectedRun.base_full_backup_id.slice(0, 16)}</span>
                  </p>
                )}
                {selectedRun.manifest?.from && (
                  <p className="text-text-secondary">
                    Ventana: {formatDateTime(selectedRun.manifest.from)} →{" "}
                    {formatDateTime(selectedRun.manifest.to)}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedRun.manifest?.chain_valid !== false ? "success" : "danger"}
                  >
                    {selectedRun.manifest?.chain_valid !== false ? "Cadena valida" : "Cadena rota"}
                  </Badge>
                  {selectedRun.manifest?.coverage === "partial" && (
                    <Badge variant="warning">Cobertura parcial</Badge>
                  )}
                </div>
                {selectedRun.manifest?.coverage === "partial" && (
                  <p className="text-warning">
                    Esta copia incremental solo cubre modulos con columna updated_at. No debe considerarse
                    recuperacion completa del sistema.
                  </p>
                )}
              </div>
            )}

            {/* Cambios capturados */}
            {selectedRun.backup_type === "incremental" && selectedRun.manifest?.changes && (
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">Cambios capturados</p>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Entidad</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Modificados</th>
                        <th className="px-3 py-2 text-right font-medium text-text-secondary">Eliminados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(selectedRun.manifest.changes).map(([key, ch]) => (
                        <tr key={key}>
                          <td className="px-3 py-2 font-medium text-text-primary">{key}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{ch.modified}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{ch.deleted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <BackupRunDetails run={selectedRun} />
          </div>
        )}
      </Drawer>

      {/* Modal de motivo de bloqueo */}
      {lockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-6 shadow-xl">
            <p className="text-sm font-semibold text-text-primary">Bloquear copia</p>
            <p className="text-xs text-text-secondary">
              Las copias bloqueadas no expiran automaticamente y requieren desbloqueo manual para eliminarse.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Motivo (obligatorio)</label>
              <select className="input" value={lockReason} onChange={(e) => setLockReason(e.target.value)}>
                <option value="">Selecciona un motivo</option>
                <option value="cierre fiscal">Cierre fiscal</option>
                <option value="auditoria">Auditoria</option>
                <option value="migracion">Migracion</option>
                <option value="incidencia">Incidencia</option>
                <option value="legal">Requerimiento legal</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setLockTarget(null); setLockReason(""); }} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-muted">Cancelar</button>
              <button type="button" onClick={() => handleLock(lockTarget)} disabled={isPending || !lockReason} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
                {isPending ? "Bloqueando..." : "Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const DB_EXPORT_LABELS: Record<string, string> = {
  complete: "Completo",
  partial: "Parcial",
  failed: "Fallido",
  pending: "—",
};

const DB_EXPORT_VARIANT: Record<string, "success" | "warning" | "danger" | "muted"> = {
  complete: "success",
  partial: "warning",
  failed: "danger",
  pending: "muted",
};
