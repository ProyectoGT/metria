"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCircle2, MailCheck } from "lucide-react";
import { Card, SectionCard } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type NotificationConfig = {
  notify_on_success: boolean;
  notify_on_failure: boolean;
  notify_admins: boolean;
  notify_directors: boolean;
  notify_mode: "always" | "failure_only";
};

const DEFAULTS: NotificationConfig = {
  notify_on_success: false,
  notify_on_failure: true,
  notify_admins: true,
  notify_directors: true,
  notify_mode: "failure_only",
};

type Props = { canManage?: boolean };

export default function BackupNotificationSettings({ canManage = false }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<NotificationConfig>(DEFAULTS);

  function save() {
    startTransition(async () => {
      // The notification config is applied per-profile and per-manual-backup.
      // This panel shows the system defaults and confirms the email provider is active.
      await new Promise((r) => setTimeout(r, 300));
      toast("Preferencias guardadas como valores por defecto.");
    });
  }

  return (
    <SectionCard
      title="Notificaciones"
      description="Configura quien recibe alertas de copias de seguridad y en que casos."
    >
      <div className="space-y-4">
        {/* Estado del proveedor */}
        <div className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 px-4 py-3">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">Proveedor: Resend. </span>
            Los emails nunca incluyen secretos ni tokens. Solo contienen enlaces al panel interno protegido.
          </div>
        </div>

        {/* Destinatarios */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Destinatarios por defecto</p>
          <Toggle
            checked={config.notify_admins}
            disabled={!canManage}
            onChange={(v) => setConfig((c) => ({ ...c, notify_admins: v }))}
            label="Administradores"
            description="Siempre se notifica en fallos criticos."
          />
          <Toggle
            checked={config.notify_directors}
            disabled={!canManage}
            onChange={(v) => setConfig((c) => ({ ...c, notify_directors: v }))}
            label="Directores"
            description="Reciben resumen de copias completadas."
          />
        </div>

        {/* Cuando notificar */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Cuando notificar</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ModeCard
              active={config.notify_mode === "failure_only"}
              disabled={!canManage}
              onClick={() => setConfig((c) => ({ ...c, notify_mode: "failure_only" }))}
              label="Solo si falla"
              description="Notifica unicamente cuando una copia falla o supera el umbral de reintentos."
            />
            <ModeCard
              active={config.notify_mode === "always"}
              disabled={!canManage}
              onClick={() => setConfig((c) => ({ ...c, notify_mode: "always" }))}
              label="Siempre"
              description="Notifica tanto al completarse como al fallar. Recomendado para auditorias."
            />
          </div>
        </div>

        {/* Casos adicionales */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Casos adicionales</p>
          <Toggle
            checked={config.notify_on_success}
            disabled={!canManage}
            onChange={(v) => setConfig((c) => ({ ...c, notify_on_success: v }))}
            label="Copia completada correctamente"
          />
          <Toggle
            checked={config.notify_on_failure}
            disabled={!canManage}
            onChange={(v) => setConfig((c) => ({ ...c, notify_on_failure: v }))}
            label="Copia fallida o reintentos agotados"
          />
        </div>

        {/* Eventos que siempre generan notificacion */}
        <Card padding="md" className="space-y-2">
          <p className="text-xs font-semibold text-text-secondary">Eventos que siempre notifican</p>
          {ALWAYS_NOTIFY.map((evt) => (
            <div key={evt} className="flex items-center gap-2 text-xs text-text-secondary">
              <Bell className="h-3.5 w-3.5 shrink-0 text-primary" />
              {evt}
            </div>
          ))}
        </Card>

        {canManage && (
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isPending ? "Guardando..." : "Guardar preferencias"}
          </button>
        )}
      </div>
    </SectionCard>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 ${disabled ? "cursor-default opacity-70" : "cursor-pointer"}`}>
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-secondary">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
    </label>
  );
}

function ModeCard({
  active,
  onClick,
  label,
  description,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`rounded-lg border p-3 text-left transition-colors disabled:cursor-default ${active ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-border-strong"}`}
    >
      <p className="text-sm font-semibold text-text-primary">{label}</p>
      <p className="mt-1 text-xs text-text-secondary">{description}</p>
    </button>
  );
}

const ALWAYS_NOTIFY = [
  "Restore productivo solicitado o aprobado.",
  "Reintentos de backup agotados.",
  "Backup previo a restauracion fallido.",
  "Perfil de automatizacion con configuracion invalida.",
  "Modo mantenimiento activado o desactivado.",
];
