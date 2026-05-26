"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck, Trash2 } from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card, SectionCard } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { RetentionCandidate, RetentionCleanupResult, RetentionPolicy } from "../types/backup.types";
import { DEFAULT_RETENTION_POLICY } from "../types/backup.types";
import { formatDateTime } from "../utils/backupFormatters";
import {
  saveRetentionConfigAction,
  previewRetentionAction,
  executeRetentionCleanupAction,
} from "@/app/(crm)/backups/actions";

type Props = {
  initialPolicy?: RetentionPolicy;
  canManage: boolean;
};

export default function BackupRetentionEditor({ initialPolicy, canManage }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [policy, setPolicy] = useState<RetentionPolicy>(initialPolicy ?? DEFAULT_RETENTION_POLICY);
  const [preview, setPreview] = useState<RetentionCleanupResult | null>(null);
  const [confirmCleanup, setConfirmCleanup] = useState(false);

  function handleSave() {
    startTransition(async () => {
      const result = await saveRetentionConfigAction(policy);
      if (result.ok) toast(result.message);
      else toast(result.message, "error");
    });
  }

  function handlePreview() {
    startTransition(async () => {
      const result = await previewRetentionAction();
      if (result.ok) {
        setPreview(result.result);
        toast("Vista previa generada. Ninguna copia fue modificada.");
      } else {
        toast(result.message, "error");
      }
    });
  }

  function handleCleanup() {
    startTransition(async () => {
      const result = await executeRetentionCleanupAction();
      setConfirmCleanup(false);
      if (result.ok) {
        setPreview(result.result);
        toast(
          result.result.expired_count > 0
            ? `Limpieza completada: ${result.result.expired_count} copia(s) expiradas.`
            : "Limpieza completada. No habia copias a expirar.",
        );
      } else {
        toast(result.message, "error");
      }
    });
  }

  const toExpire = preview?.candidates.filter((c) => !c.protected && c.expirationReason) ?? [];
  const protected_ = preview?.candidates.filter((c) => c.protected) ?? [];

  return (
    <div className="space-y-5">
      <SectionCard
        title="Politica de retencion"
        description="Define cuanto tiempo se conservan las copias. Las reglas de proteccion siempre tienen prioridad."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PolicyField label="Incrementales (dias)" value={policy.incrementals_days} min={1} max={365} disabled={!canManage} onChange={(v) => setPolicy((p) => ({ ...p, incrementals_days: v }))} />
          <PolicyField label="Totales diarios (dias)" value={policy.daily_full_days} min={1} max={365} disabled={!canManage} onChange={(v) => setPolicy((p) => ({ ...p, daily_full_days: v }))} />
          <PolicyField label="Totales semanales (semanas)" value={policy.weekly_full_weeks} min={1} max={104} disabled={!canManage} onChange={(v) => setPolicy((p) => ({ ...p, weekly_full_weeks: v }))} />
          <PolicyField label="Totales mensuales (meses)" value={policy.monthly_full_months} min={1} max={120} disabled={!canManage} onChange={(v) => setPolicy((p) => ({ ...p, monthly_full_months: v }))} />
          <PolicyField label="Totales anuales (años)" value={policy.annual_full_years} min={1} max={20} disabled={!canManage} onChange={(v) => setPolicy((p) => ({ ...p, annual_full_years: v }))} />
          <PolicyField label="Minimo de copias siempre" value={policy.keep_min_copies} min={1} max={50} disabled={!canManage} onChange={(v) => setPolicy((p) => ({ ...p, keep_min_copies: v }))} />
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button type="button" onClick={handleSave} disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
              {isPending ? "Guardando..." : "Guardar politica"}
            </button>
            <button type="button" onClick={handlePreview} disabled={isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-muted disabled:opacity-50">
              Vista previa de limpieza
            </button>
          </div>
        )}
      </SectionCard>

      {/* Reglas de proteccion */}
      <Card padding="md" className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Reglas de proteccion</p>
        <div className="grid gap-1.5 text-xs text-text-secondary sm:grid-cols-2">
          {PROTECTION_RULES.map((rule) => (
            <div key={rule} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              {rule}
            </div>
          ))}
        </div>
      </Card>

      {/* Vista previa */}
      {preview && (
        <SectionCard
          title={`Vista previa${preview.dry_run ? " (simulacion)" : " — ejecutada"}`}
          description={`${preview.candidates.length} candidatos analizados el ${formatDateTime(preview.ran_at)}`}
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant={toExpire.length > 0 ? "warning" : "muted"} className="flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> {toExpire.length} a expirar
            </Badge>
            <Badge variant="success" className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> {protected_.length} protegidas
            </Badge>
            {!preview.dry_run && preview.expired_count > 0 && (
              <Badge variant="primary" className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> {preview.expired_count} expiradas
              </Badge>
            )}
          </div>

          {toExpire.length > 0 && (
            <CandidateList label="Candidatas a expirar" candidates={toExpire} />
          )}

          {protected_.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-text-secondary">
                Copias protegidas ({protected_.length})
              </summary>
              <div className="mt-2">
                <CandidateList label="" candidates={protected_} showProtection />
              </div>
            </details>
          )}

          {preview.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e}
            </div>
          ))}

          {canManage && preview.dry_run && toExpire.length > 0 && (
            <div className="border-t border-border pt-4">
              {!confirmCleanup ? (
                <button type="button" onClick={() => setConfirmCleanup(true)} className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/15">
                  Ejecutar limpieza ({toExpire.length} copias)
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-danger">Se marcaran {toExpire.length} copias como expiradas.</p>
                  <button type="button" onClick={handleCleanup} disabled={isPending} className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/80 disabled:opacity-50">
                    {isPending ? "Ejecutando..." : "Confirmar"}
                  </button>
                  <button type="button" onClick={() => setConfirmCleanup(false)} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-muted">
                    Cancelar
                  </button>
                </div>
              )}
              <p className="mt-2 text-xs text-text-secondary">
                Las copias expiradas son marcadas logicamente. No se borra ningun archivo fisico.
              </p>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

function PolicyField({ label, value, min, max, disabled, onChange }: { label: string; value: number; min: number; max: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <input type="number" className="input" min={min} max={max} value={value} disabled={disabled}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))} />
    </div>
  );
}

function CandidateList({ label, candidates, showProtection = false }: { label: string; candidates: RetentionCandidate[]; showProtection?: boolean }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-semibold text-text-secondary">{label}</p>}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-background">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">ID</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Edad</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">{showProtection ? "Proteccion" : "Motivo"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {candidates.slice(0, 15).map(({ run, protectionReason, expirationReason, ageHours }) => (
              <tr key={run.id}>
                <td className="px-3 py-2 font-mono">{run.id.slice(0, 8)}</td>
                <td className="px-3 py-2">{run.backup_type === "full" ? "Total" : "Incremental"}</td>
                <td className="px-3 py-2 tabular-nums">{Math.round(ageHours / 24)} dias</td>
                <td className="px-3 py-2 text-text-secondary">{showProtection ? protectionReason : expirationReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {candidates.length > 15 && <p className="px-3 py-2 text-xs text-text-secondary">... y {candidates.length - 15} mas.</p>}
      </div>
    </div>
  );
}

const PROTECTION_RULES = [
  "La ultima copia verificada nunca expira.",
  "La ultima copia total verificada nunca expira.",
  "Las copias bloqueadas manualmente nunca expiran.",
  "Las totales con incrementales dependientes nunca expiran.",
  "Los incrementales intermedios de una cadena nunca expiran.",
  "Se conservan siempre al menos N copias verificadas.",
  "Sin borrado fisico automatico en esta fase.",
];
