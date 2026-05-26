"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Bell, CheckCircle2, Database, HardDrive, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BACKUP_SCOPE_OPTIONS } from "../config/backupEntities";
import type { BackupScopeKey, BackupType, BackupVerificationLevel } from "../types/backup.types";
import { createManualBackupAction } from "@/app/(crm)/backups/actions";

type Props = {
  canCreateIncremental: boolean;
  onCreated?: () => void;
};

const STEPS = ["Tipo", "Alcance", "Destino", "Verificacion", "Notificaciones", "Confirmacion"];

export default function ManualBackupWizard({ canCreateIncremental, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [backupType, setBackupType] = useState<BackupType>("full");
  const [scope, setScope] = useState<BackupScopeKey[]>(["all"]);
  const [destination, setDestination] = useState<"supabase_storage" | "s3" | "local_download">("supabase_storage");
  const [verificationLevel, setVerificationLevel] = useState<BackupVerificationLevel>("basic");
  const [notifyCreator, setNotifyCreator] = useState(true);
  const [notifyAdmins, setNotifyAdmins] = useState(true);
  const [notifyDirectors, setNotifyDirectors] = useState(true);
  const [notifyMode, setNotifyMode] = useState<"always" | "failure_only">("failure_only");
  const [confirmationText, setConfirmationText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = useMemo(() => scope.length > 0 && confirmationText.trim().toUpperCase() === "CONFIRMAR", [scope, confirmationText]);

  function toggleScope(key: BackupScopeKey) {
    setScope((current) => {
      if (key === "all") return current.includes("all") ? [] : ["all"];
      const next = current.filter((item) => item !== "all");
      return next.includes(key) ? next.filter((item) => item !== key) : [...next, key];
    });
  }

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await createManualBackupAction({
        backupType,
        scope,
        destination,
        verificationLevel,
        notifyCreator,
        notifyAdmins,
        notifyDirectors,
        notifyMode,
        confirmationText,
      });
      setMessage(result.message);
      if (result.ok) {
        onCreated?.();
        setConfirmationText("");
      }
    });
  }

  return (
    <Card padding="lg" className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              step === index ? "bg-primary text-white" : "bg-surface-raised text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          <ChoiceCard
            icon={<Database className="h-5 w-5" />}
            title="Copia total"
            description="Guarda todo el alcance seleccionado desde cero."
            active={backupType === "full"}
            onClick={() => setBackupType("full")}
          />
          <ChoiceCard
            icon={<HardDrive className="h-5 w-5" />}
            title="Copia incremental"
            description="Guarda solo cambios desde la ultima copia total verificada."
            active={backupType === "incremental"}
            disabled={!canCreateIncremental}
            onClick={() => canCreateIncremental && setBackupType("incremental")}
          />
          {!canCreateIncremental && (
            <div className="md:col-span-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-secondary">
              Para crear una copia incremental debe existir al menos una copia total verificada.
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {BACKUP_SCOPE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => toggleScope(option.key)}
              className={[
                "rounded-ds-lg border p-4 text-left transition-colors",
                scope.includes(option.key) ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-border-strong",
              ].join(" ")}
            >
              <span className="text-sm font-semibold text-text-primary">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-text-secondary">{option.description}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3 md:grid-cols-3">
          <ChoiceCard title="Supabase Storage privado" description="Destino interno protegido y sin URLs publicas." active={destination === "supabase_storage"} onClick={() => setDestination("supabase_storage")} />
          <ChoiceCard title="S3 / almacenamiento externo" description="Requiere credenciales de S3 configuradas en variables de entorno." active={destination === "s3"} disabled onClick={() => setDestination("s3")} badge="Requiere config." />
          <ChoiceCard title="Descarga manual cifrada" description="Preparado para export descargable con reautenticacion." active={destination === "local_download"} onClick={() => setDestination("local_download")} />
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-3 md:grid-cols-3">
          <ChoiceCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Basica"
            description="Manifiesto, conteos de filas y checksum verificado."
            active={verificationLevel === "basic"}
            onClick={() => setVerificationLevel("basic")}
          />
          <ChoiceCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Completa"
            description="Exportacion real de datos, checksums por entidad, schema snapshot e integridad de Storage."
            active={verificationLevel === "complete"}
            onClick={() => setVerificationLevel("complete")}
          />
          <ChoiceCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Completa + simulacion"
            description="Exportacion completa y analisis automatico de impacto para validar la restauracion."
            active={verificationLevel === "restore_simulation"}
            onClick={() => setVerificationLevel("restore_simulation")}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <Toggle checked={notifyCreator} onChange={setNotifyCreator} label="Notificar al usuario que crea la copia" />
          <Toggle checked={notifyAdmins} onChange={setNotifyAdmins} label="Notificar a administradores" />
          <Toggle checked={notifyDirectors} onChange={setNotifyDirectors} label="Notificar a directores" />
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant={notifyMode === "failure_only" ? "primary" : "secondary"} size="sm" onClick={() => setNotifyMode("failure_only")}>Solo si falla</Button>
            <Button variant={notifyMode === "always" ? "primary" : "secondary"} size="sm" onClick={() => setNotifyMode("always")}>Siempre</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Esta accion puede incluir datos sensibles del sistema.</p>
                <p className="mt-1 text-sm text-text-secondary">Confirma tu identidad escribiendo CONFIRMAR. El flujo queda preparado para MFA/reautenticacion completa.</p>
              </div>
            </div>
          </div>
          <Input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} placeholder="CONFIRMAR" />
        </div>
      )}

      {message && <p className="rounded-lg bg-surface-raised px-4 py-3 text-sm text-text-secondary">{message}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Bell className="h-4 w-4" />
          El proceso se ejecuta en segundo plano mediante jobs.
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={step === 0 || isPending} onClick={() => setStep((value) => Math.max(0, value - 1))}>Anterior</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}>Continuar</Button>
          ) : (
            <Button loading={isPending} disabled={!canSubmit} icon={<CheckCircle2 className="h-4 w-4" />} onClick={submit}>Crear copia</Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ChoiceCard({
  title,
  description,
  active,
  disabled,
  onClick,
  icon,
  badge,
}: {
  title: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-ds-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        active ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-border-strong",
      ].join(" ")}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          {icon}
          {title}
        </span>
        {badge && <Badge variant="muted">{badge}</Badge>}
      </span>
      <span className="mt-2 block text-xs leading-5 text-text-secondary">{description}</span>
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary" />
    </label>
  );
}
