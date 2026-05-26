"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  HardDrive,
  Info,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card, SectionCard } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { BackupRun, DryRunReport, RestoreRun } from "../types/backup.types";
import { backupTypeLabel, formatBytes, formatDateTime } from "../utils/backupFormatters";
import {
  startDryRunAction,
  requestProductionRestoreAction,
  approveProductionRestoreAction,
  rejectProductionRestoreAction,
  cancelRestoreAction,
  executeProductionRestoreAction,
} from "@/app/(crm)/backups/actions";
import type { RestoreExecutionResult } from "@/modules/backups/services/backupRestoreExecutionService";

type SandboxStep = "select" | "validate" | "report";
type ProdStep = "entities" | "request" | "approval" | "confirm" | "execute" | "result";
type Mode = "sandbox" | "production";

type Props = { runs: BackupRun[]; canManage?: boolean };

export default function RestoreWizard({ runs, canManage = false }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>("sandbox");
  const [sandboxStep, setSandboxStep] = useState<SandboxStep>("select");
  const [prodStep, setProdStep] = useState<ProdStep>("entities");

  const [selectedRun, setSelectedRun] = useState<BackupRun | null>(null);
  const [restoreRun, setRestoreRun] = useState<RestoreRun | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState("");
  const [execResult, setExecResult] = useState<RestoreExecutionResult | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const verified = runs.filter((r) => r.status === "verified");

  // ── Sandbox flow ──────────────────────────────────────────────────────────

  function handleSelect(run: BackupRun) {
    setSelectedRun(run);
    setSandboxStep("validate");
  }

  function handleStartDryRun() {
    if (!selectedRun) return;
    startTransition(async () => {
      const result = await startDryRunAction(selectedRun.id);
      if (result.ok) { setRestoreRun(result.restoreRun); setSandboxStep("report"); }
      else toast(result.message, "error");
    });
  }

  function reset() {
    setSandboxStep("select"); setProdStep("entities");
    setSelectedRun(null); setRestoreRun(null);
    setSelectedEntities([]); setConfirmText(""); setExecResult(null);
  }

  // ── Production flow ────────────────────────────────────────────────────────

  function goToProduction() { setMode("production"); setProdStep("entities"); }

  function handleRequestProduction() {
    if (!restoreRun) return;
    startTransition(async () => {
      const result = await requestProductionRestoreAction(restoreRun.id, selectedEntities);
      if (result.ok) { toast(result.message); setProdStep("approval"); }
      else toast(result.message, "error");
    });
  }

  function handleApprove() {
    if (!restoreRun) return;
    startTransition(async () => {
      const result = await approveProductionRestoreAction(restoreRun.id);
      if (result.ok) { toast(result.message); setProdStep("confirm"); }
      else toast(result.message, "error");
    });
  }

  function handleReject() {
    if (!restoreRun || !rejectReason.trim()) return;
    startTransition(async () => {
      const result = await rejectProductionRestoreAction(restoreRun.id, rejectReason);
      if (result.ok) { toast(result.message); reset(); }
      else toast(result.message, "error");
    });
  }

  function handleExecute() {
    if (!restoreRun || !selectedRun || confirmText !== "RESTAURAR PRODUCCION") return;
    startTransition(async () => {
      const result = await executeProductionRestoreAction(
        restoreRun.id, selectedRun.id, selectedEntities, confirmText,
      );
      if (result.ok) { setExecResult(result.result); setProdStep("result"); }
      else toast(result.message, "error");
    });
  }

  function handleCancel() {
    if (!restoreRun) { reset(); return; }
    startTransition(async () => {
      await cancelRestoreAction(restoreRun.id);
      toast("Solicitud cancelada.");
      reset();
    });
  }

  const reportEntities = restoreRun?.dry_run_result?.entities;
  const entityKeys = reportEntities ? Object.keys(reportEntities) : [];

  return (
    <div className="space-y-5">
      {/* Aviso permanente */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Centro de restauracion. </span>
          El sandbox analiza el impacto sin tocar produccion. El restore productivo requiere doble aprobacion, backup previo automatico y confirmacion explicita.
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("sandbox")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${mode === "sandbox" ? "bg-primary text-white" : "border border-border text-text-secondary hover:bg-muted"}`}
        >
          <Shield className="h-4 w-4" /> Sandbox
        </button>
        <button
          type="button"
          onClick={() => setMode("production")}
          disabled={!restoreRun || restoreRun.status !== "ready"}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${mode === "production" ? "bg-danger text-white" : "border border-danger/30 text-danger hover:bg-danger/10"}`}
        >
          <ShieldAlert className="h-4 w-4" /> Produccion
          {restoreRun?.status !== "ready" && <Lock className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── SANDBOX MODE ──────────────────────────────────────────────────── */}
      {mode === "sandbox" && (
        <div className="space-y-5">
          {/* Stepper */}
          <Stepper steps={SANDBOX_STEPS} currentId={sandboxStep} />

          {sandboxStep === "select" && (
            <BackupSelector runs={verified} onSelect={handleSelect} />
          )}

          {sandboxStep === "validate" && selectedRun && (
            <div className="space-y-4">
              <BackupSummaryBar run={selectedRun} onReset={reset} />
              <Card padding="md" className="space-y-2">
                <p className="text-sm font-semibold text-text-primary">Que hace el analisis</p>
                <ul className="space-y-1 text-xs text-text-secondary">
                  {DRY_RUN_STEPS.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />{s}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-medium text-warning">No modifica ningun dato.</p>
              </Card>
              <button type="button" onClick={handleStartDryRun} disabled={isPending} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
                {isPending ? "Analizando..." : "Iniciar analisis de restauracion"}
              </button>
            </div>
          )}

          {sandboxStep === "report" && restoreRun && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Informe de impacto</p>
                  <p className="text-xs text-text-secondary">Solo simulacion — produccion no modificada</p>
                </div>
                <button type="button" onClick={reset} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-muted">Nuevo</button>
              </div>
              {restoreRun.dry_run_result && <DryRunReportView report={restoreRun.dry_run_result} />}
              {restoreRun.status === "ready" && canManage && (
                <button type="button" onClick={goToProduction} className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10">
                  <ShieldAlert className="h-4 w-4" /> Iniciar restore productivo
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTION MODE ──────────────────────────────────────────────── */}
      {mode === "production" && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Modo produccion activo.</p>
              <p className="text-xs">Esta operacion modificara datos reales. Requiere doble aprobacion y creara un backup previo automatico.</p>
            </div>
          </div>

          <Stepper steps={PROD_STEPS} currentId={prodStep} />

          {/* Step: select entities */}
          {prodStep === "entities" && (
            <div className="space-y-4">
              <SectionCard title="Seleccionar entidades a restaurar" description="Deja todas sin marcar para restaurar el backup completo.">
                {entityKeys.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {entityKeys.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedEntities((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k])}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedEntities.includes(k) ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-muted"}`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">Se restauraran todas las entidades del backup.</p>
                )}
                <p className="text-xs text-text-secondary">
                  {selectedEntities.length === 0 ? "Todas las entidades." : `${selectedEntities.length} seleccionada(s): ${selectedEntities.join(", ")}`}
                </p>
              </SectionCard>
              <div className="flex gap-3">
                <button type="button" onClick={handleRequestProduction} disabled={isPending} className="rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white hover:bg-danger/80 disabled:opacity-50">
                  {isPending ? "Enviando..." : "Solicitar aprobacion"}
                </button>
                <button type="button" onClick={() => setMode("sandbox")} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-muted">Cancelar</button>
              </div>
            </div>
          )}

          {/* Step: approval */}
          {prodStep === "approval" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">Pendiente de aprobacion</p>
                  <p className="text-text-secondary">Otro administrador debe aprobar esta solicitud. No puedes aprobar tu propia restauracion.</p>
                </div>
              </div>
              <Card padding="md" className="space-y-3">
                <p className="text-xs font-semibold text-text-secondary">Como administrador, puedes aprobar o rechazar</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleApprove} disabled={isPending} className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/80 disabled:opacity-50">
                    {isPending ? "..." : "Aprobar restauracion"}
                  </button>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="Motivo del rechazo"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <button type="button" onClick={handleReject} disabled={isPending || !rejectReason.trim()} className="rounded-lg border border-danger/30 px-3 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
                      Rechazar
                    </button>
                  </div>
                </div>
              </Card>
              <button type="button" onClick={handleCancel} className="text-xs text-text-secondary hover:text-text-primary">Cancelar solicitud</button>
            </div>
          )}

          {/* Step: confirm */}
          {prodStep === "confirm" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">Aprobado.</p>
                  <p className="text-text-secondary">El restore productivo ha sido aprobado. Escribe el texto de confirmacion para ejecutar.</p>
                </div>
              </div>
              <SectionCard title="Confirmacion de seguridad">
                <p className="text-xs text-text-secondary mb-3">
                  Esta accion realizara los siguientes pasos automaticamente:
                </p>
                <ol className="space-y-1.5 text-xs text-text-secondary list-decimal list-inside mb-4">
                  <li>Crear un backup total de seguridad previo</li>
                  <li>Activar modo mantenimiento</li>
                  <li>Restaurar las entidades seleccionadas</li>
                  <li>Verificar integridad posterior</li>
                  <li>Desactivar modo mantenimiento</li>
                </ol>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-danger">Escribe exactamente: <span className="font-mono">RESTAURAR PRODUCCION</span></label>
                  <input
                    type="text"
                    className={`input font-mono ${confirmText === "RESTAURAR PRODUCCION" ? "border-success" : ""}`}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="RESTAURAR PRODUCCION"
                  />
                </div>
              </SectionCard>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isPending || confirmText !== "RESTAURAR PRODUCCION"}
                  className="rounded-lg bg-danger px-6 py-2.5 text-sm font-bold text-white hover:bg-danger/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? "Ejecutando restore..." : "RESTAURAR PRODUCCION"}
                </button>
                <button type="button" onClick={handleCancel} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-muted">Cancelar</button>
              </div>
            </div>
          )}

          {/* Step: result */}
          {prodStep === "result" && execResult && (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${execResult.success ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
                {execResult.success ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 text-danger" />}
                <div>
                  <p className={`font-semibold text-sm ${execResult.success ? "text-success" : "text-danger"}`}>
                    {execResult.success ? "Restauracion completada correctamente." : "La restauracion encontro errores."}
                  </p>
                  {execResult.pre_restore_backup_id && (
                    <p className="text-xs text-text-secondary mt-1">Backup previo: <span className="font-mono">{execResult.pre_restore_backup_id.slice(0, 16)}</span></p>
                  )}
                </div>
              </div>

              {/* Entity results */}
              {execResult.entities.length > 0 && (
                <SectionCard title="Resultado por entidad">
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-background">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-text-secondary">Entidad</th>
                          <th className="px-3 py-2 text-right font-medium text-text-secondary">Restauradas</th>
                          <th className="px-3 py-2 text-right font-medium text-text-secondary">Omitidas</th>
                          <th className="px-3 py-2 text-center font-medium text-text-secondary">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {execResult.entities.map((e) => (
                          <tr key={e.entity_key}>
                            <td className="px-3 py-2 font-medium text-text-primary">{e.entity_key}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{e.restored}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{e.skipped}</td>
                            <td className="px-3 py-2 text-center">
                              {e.status === "completed" ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-success" />
                                : e.status === "skipped" ? <span className="text-text-secondary">—</span>
                                : <XCircle className="mx-auto h-3.5 w-3.5 text-danger" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}

              {/* Verification */}
              {execResult.verification && (
                <SectionCard title="Verificacion posterior">
                  <Badge variant={execResult.verification.passed ? "success" : "warning"}>
                    {execResult.verification.passed ? "Verificacion correcta" : "Verificacion con advertencias"}
                  </Badge>
                  {execResult.verification.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-warning">{w}</p>
                  ))}
                </SectionCard>
              )}

              {execResult.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{e}
                </div>
              ))}

              <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-muted">Volver al inicio</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function BackupSelector({ runs, onSelect }: { runs: BackupRun[]; onSelect: (r: BackupRun) => void }) {
  if (runs.length === 0) {
    return <EmptyState variant="compact" icon={<RotateCcw className="h-8 w-8" />} title="No hay copias verificadas" description="Crea una copia verificada antes de restaurar." />;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-text-secondary">Selecciona el backup a analizar.</p>
      {runs.map((run) => {
        const chainBroken = run.backup_type === "incremental" && run.manifest?.chain_valid === false;
        return (
          <div key={run.id} role="button" tabIndex={chainBroken ? -1 : 0}
            className={`rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors ${!chainBroken ? "cursor-pointer hover:border-primary/40" : "cursor-not-allowed opacity-60"}`}
            onClick={() => !chainBroken && onSelect(run)}
            onKeyDown={(e) => e.key === "Enter" && !chainBroken && onSelect(run)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-text-secondary">{run.id.slice(0, 16)}</span>
                  <Badge variant={run.backup_type === "full" ? "primary" : "muted"}>{backupTypeLabel(run.backup_type)}</Badge>
                  <Badge variant={run.manifest?.phase === "data_export" ? "success" : "warning"}>
                    {run.manifest?.phase === "data_export" ? "Datos reales" : "Manifiesto logico"}
                  </Badge>
                  {chainBroken && <Badge variant="danger">Cadena rota</Badge>}
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  Verificada: {formatDateTime(run.verified_at)} · {formatBytes(run.size_bytes)}
                </p>
              </div>
              {!chainBroken && <button type="button" className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark">Seleccionar</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BackupSummaryBar({ run, onReset }: { run: BackupRun; onReset: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-2">
      <p className="text-sm">
        <span className="text-text-secondary">Backup: </span>
        <span className="font-mono font-medium text-text-primary">{run.id.slice(0, 16)}</span>
        <span className="ml-2 text-text-secondary">· {formatDateTime(run.verified_at)}</span>
      </p>
      <button type="button" onClick={onReset} className="text-xs text-text-secondary hover:text-text-primary">Cambiar</button>
    </div>
  );
}

function Stepper({ steps, currentId }: { steps: { id: string; label: string }[]; currentId: string }) {
  const currentIdx = steps.findIndex((s) => s.id === currentId);
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i === currentIdx ? "bg-primary text-white" : i < currentIdx ? "bg-success text-white" : "bg-muted text-text-secondary"}`}>{i + 1}</div>
          <span className={i === currentIdx ? "font-semibold text-text-primary" : "text-text-secondary"}>{s.label}</span>
          {i < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-text-secondary" />}
        </div>
      ))}
    </div>
  );
}

function DryRunReportView({ report }: { report: DryRunReport }) {
  const hasErrors = report.validations.some((v) => v.status === "failed");
  const hasConflicts = report.total_estimated_conflicts > 0;
  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${hasErrors ? "border-danger/30 bg-danger/5" : hasConflicts ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"}`}>
        {hasErrors ? <XCircle className="mt-0.5 h-5 w-5 text-danger" /> : hasConflicts ? <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />}
        <p className="text-sm text-text-secondary">{report.recommendation}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Filas en backup" value={report.total_backup_rows.toLocaleString("es-ES")} icon={<Database className="h-4 w-4" />} />
        <StatCard label="Filas actuales" value={report.total_current_rows.toLocaleString("es-ES")} icon={<Database className="h-4 w-4" />} />
        <StatCard label="Conflictos estimados" value={report.total_estimated_conflicts.toLocaleString("es-ES")} icon={<AlertTriangle className="h-4 w-4" />} variant={hasConflicts ? "warning" : "success"} />
      </div>
      <SectionCard title="Validaciones">
        <div className="space-y-1.5">
          {report.validations.map((v) => (
            <div key={v.check} className="flex items-center gap-2 text-xs">
              {v.status === "passed" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : v.status === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-warning" /> : <XCircle className="h-3.5 w-3.5 text-danger" />}
              <span className="font-medium text-text-primary">{CHECK_LABELS[v.check] ?? v.check}:</span>
              <span className="text-text-secondary">{v.message}</span>
            </div>
          ))}
        </div>
      </SectionCard>
      {Object.keys(report.entities).length > 0 && (
        <SectionCard title="Impacto por entidad">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-background">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Entidad</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Backup</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Actual</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Conflictos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.values(report.entities).map((e) => (
                  <tr key={e.entity_key}>
                    <td className="px-3 py-2 font-medium text-text-primary">{e.entity_key}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{e.backup_rows.toLocaleString("es-ES")}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{e.current_rows.toLocaleString("es-ES")}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${e.estimated_conflicts > 0 ? "text-warning" : "text-success"}`}>
                      {e.estimated_conflicts > 0 ? e.estimated_conflicts.toLocaleString("es-ES") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
      {report.storage_objects_in_backup > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-xs">
          <HardDrive className="h-4 w-4 text-text-secondary" />
          <span><span className="font-medium text-text-primary">Storage:</span> <span className="text-text-secondary">{report.storage_objects_in_backup} objeto(s) en backup</span></span>
        </div>
      )}
      {report.warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Badge variant="muted">Solo simulacion</Badge>
        <Badge variant="danger">Produccion: requiere aprobacion</Badge>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, variant = "muted" }: { label: string; value: string; icon: React.ReactNode; variant?: "success" | "warning" | "muted" }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-text-secondary">{icon}<span className="text-xs">{label}</span></div>
      <p className={`mt-1 text-lg font-bold ${variant === "warning" ? "text-warning" : variant === "success" ? "text-success" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}

const SANDBOX_STEPS = [
  { id: "select", label: "Seleccionar" },
  { id: "validate", label: "Analizar" },
  { id: "report", label: "Informe" },
];

const PROD_STEPS = [
  { id: "entities", label: "Entidades" },
  { id: "request", label: "Solicitar" },
  { id: "approval", label: "Aprobacion" },
  { id: "confirm", label: "Confirmar" },
  { id: "execute", label: "Ejecutar" },
  { id: "result", label: "Resultado" },
];

const DRY_RUN_STEPS = [
  "Verifica que el backup esta verificado y es de esta empresa.",
  "Comprueba manifiesto y checksums.",
  "Valida la cadena incremental si aplica.",
  "Cuenta filas actuales y estima conflictos.",
  "Verifica acceso a Storage.",
  "Genera informe detallado sin modificar nada.",
];

const CHECK_LABELS: Record<string, string> = {
  backup_verified: "Verificado",
  manifest_exists: "Manifiesto",
  checksum_present: "Checksum",
  empresa_match: "Empresa",
  incremental_chain_valid: "Cadena",
  data_exported: "Datos",
  storage_accessible: "Storage",
};
