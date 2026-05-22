"use client";

import { useState, useTransition } from "react";
import { Eye, RotateCcw } from "lucide-react";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Drawer from "@/components/ui/drawer";
import EmptyState from "@/components/ui/empty-state";
import { Table, TableBody, TableContainer, TableHead, Td, Th, Tr } from "@/components/ui/table";
import type { BackupRun } from "../types/backup.types";
import { backupStatusLabel, backupStatusVariant, backupTypeLabel, formatBytes, formatDateTime, formatDuration } from "../utils/backupFormatters";
import { requestRestoreSimulationAction } from "@/app/(crm)/backups/actions";

export default function BackupHistoryTable({ runs }: { runs: BackupRun[] }) {
  const [selectedRun, setSelectedRun] = useState<BackupRun | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requestRestore(run: BackupRun) {
    setMessage(null);
    startTransition(async () => {
      const result = await requestRestoreSimulationAction(run.id);
      setMessage(result.message);
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
      {message && <p className="mb-3 rounded-lg bg-surface-raised px-4 py-3 text-sm text-text-secondary">{message}</p>}
      <TableContainer>
        <Table>
          <TableHead>
            <Th>ID</Th>
            <Th>Fecha</Th>
            <Th>Tipo</Th>
            <Th>Estado</Th>
            <Th>Alcance</Th>
            <Th>Tamano</Th>
            <Th>Duracion</Th>
            <Th align="right">Acciones</Th>
          </TableHead>
          <TableBody>
            {runs.map((run) => (
              <Tr key={run.id}>
                <Td className="font-mono text-xs">{run.id.slice(0, 8)}</Td>
                <Td>{formatDateTime(run.created_at)}</Td>
                <Td>{backupTypeLabel(run.backup_type)}</Td>
                <Td><Badge variant={backupStatusVariant(run.status)}>{backupStatusLabel(run.status)}</Badge></Td>
                <Td className="max-w-[220px] truncate">{Array.isArray(run.scope) ? run.scope.join(", ") : "-"}</Td>
                <Td>{formatBytes(run.size_bytes)}</Td>
                <Td>{formatDuration(run.duration_ms)}</Td>
                <Td align="right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setSelectedRun(run)}>Detalle</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={run.status !== "verified" || isPending}
                      onClick={() => requestRestore(run)}
                    >
                      Restaurar
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Estado" value={backupStatusLabel(selectedRun.status)} />
              <Detail label="Tipo" value={backupTypeLabel(selectedRun.backup_type)} />
              <Detail label="Creada" value={formatDateTime(selectedRun.created_at)} />
              <Detail label="Verificada" value={formatDateTime(selectedRun.verified_at)} />
              <Detail label="Checksum" value={selectedRun.checksum ?? "-"} mono />
              <Detail label="Manifiesto" value={selectedRun.manifest_path ?? "-"} mono />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-text-primary">Tablas verificadas</p>
              <div className="space-y-2">
                {Object.entries(selectedRun.manifest?.tables ?? {}).map(([key, table]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="text-text-primary">{key}</span>
                    <span className="text-text-secondary">{table.rows} filas</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={["mt-1 break-words text-sm font-semibold text-text-primary", mono ? "font-mono text-xs" : ""].join(" ")}>{value}</p>
    </div>
  );
}
