"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { BackupProfile, BackupProfileInput, BackupScopeKey } from "../types/backup.types";
import BackupScheduleEditor from "./BackupScheduleEditor";
import BackupNextRunPreview from "./BackupNextRunPreview";
import { createBackupProfileAction, updateBackupProfileAction } from "@/app/(crm)/backups/actions";

type Props = {
  profile?: BackupProfile;
  onClose: () => void;
  onSaved: () => void;
};

const SCOPE_OPTIONS: Array<{ value: BackupScopeKey; label: string }> = [
  { value: "all", label: "Todo" },
  { value: "database", label: "Base de datos" },
  { value: "users", label: "Usuarios" },
  { value: "contacts", label: "Contactos" },
  { value: "properties", label: "Propiedades" },
  { value: "tasks_calendar", label: "Tareas y calendario" },
  { value: "documents", label: "Documentos" },
  { value: "communications", label: "Comunicaciones" },
  { value: "settings", label: "Configuracion" },
  { value: "audit", label: "Auditoria" },
];

const DEFAULT_INPUT: BackupProfileInput = {
  name: "",
  description: "",
  backup_type: "full",
  schedule_type: "daily",
  schedule_config: { hour: "03:00" },
  timezone: "Europe/Madrid",
  scope: ["all"],
  notify_on_success: false,
  notify_on_failure: true,
  notify_admins: true,
  notify_directors: true,
  max_retries: 2,
  retry_delay_minutes: 30,
};

export default function BackupProfileForm({ profile, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<BackupProfileInput>(() =>
    profile
      ? {
          name: profile.name,
          description: profile.description ?? "",
          backup_type: profile.backup_type,
          schedule_type: profile.schedule_type,
          schedule_config: profile.schedule_config,
          timezone: profile.timezone,
          scope: profile.scope,
          notify_on_success: profile.notify_on_success,
          notify_on_failure: profile.notify_on_failure,
          notify_admins: profile.notify_admins,
          notify_directors: profile.notify_directors,
          max_retries: profile.max_retries,
          retry_delay_minutes: profile.retry_delay_minutes,
        }
      : DEFAULT_INPUT,
  );

  const isEditing = Boolean(profile);

  function handleScopeToggle(value: BackupScopeKey) {
    setForm((prev) => {
      if (value === "all") return { ...prev, scope: ["all"] };
      const without = prev.scope.filter((s) => s !== "all" && s !== value);
      const newScope = prev.scope.includes(value) ? without : [...without, value];
      return { ...prev, scope: newScope.length === 0 ? ["all"] : newScope };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("El nombre del perfil es obligatorio.", "error");
      return;
    }

    startTransition(async () => {
      const result = isEditing && profile
        ? await updateBackupProfileAction(profile.id, form)
        : await createBackupProfileAction(form);

      if (result.ok) {
        toast(result.message);
        onSaved();
      } else {
        toast(result.message, "error");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">
            {isEditing ? "Editar automatizacion" : "Nueva automatizacion"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-muted hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Nombre y descripcion */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Nombre del perfil *</label>
              <input
                className="input"
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="p.ej. Backup diario critico"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Descripcion</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe el proposito de este perfil"
                maxLength={300}
              />
            </div>
          </div>

          {/* Tipo de backup */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Tipo de copia</label>
            <div className="flex gap-3">
              {(["full", "incremental"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, backup_type: type }))}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    form.backup_type === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-text-secondary hover:bg-muted"
                  }`}
                >
                  {type === "full" ? "Copia total" : "Incremental"}
                </button>
              ))}
            </div>
            {form.backup_type === "incremental" && (
              <p className="text-xs text-text-secondary">
                Las copias incrementales requieren que exista al menos una copia total verificada.
              </p>
            )}
          </div>

          {/* Programacion */}
          <Card padding="md" className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Programacion</p>
            <BackupScheduleEditor
              scheduleType={form.schedule_type}
              scheduleConfig={form.schedule_config}
              timezone={form.timezone}
              onScheduleTypeChange={(type) =>
                setForm((p) => ({ ...p, schedule_type: type, schedule_config: {} }))
              }
              onScheduleConfigChange={(config) => setForm((p) => ({ ...p, schedule_config: config }))}
              onTimezoneChange={(tz) => setForm((p) => ({ ...p, timezone: tz }))}
            />
            <BackupNextRunPreview
              scheduleType={form.schedule_type}
              scheduleConfig={form.schedule_config}
              timezone={form.timezone}
              enabled={true}
            />
          </Card>

          {/* Alcance */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Alcance</p>
            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleScopeToggle(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.scope.includes(opt.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-text-secondary hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reintentos */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Reintentos automaticos</label>
              <input
                type="number"
                className="input"
                min={0}
                max={5}
                value={form.max_retries}
                onChange={(e) => setForm((p) => ({ ...p, max_retries: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Espera entre reintentos (min)</label>
              <input
                type="number"
                className="input"
                min={5}
                max={1440}
                value={form.retry_delay_minutes}
                onChange={(e) => setForm((p) => ({ ...p, retry_delay_minutes: parseInt(e.target.value) || 30 }))}
              />
            </div>
          </div>

          {/* Notificaciones */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Notificaciones</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  { key: "notify_on_failure", label: "Notificar en fallo" },
                  { key: "notify_on_success", label: "Notificar en exito" },
                  { key: "notify_admins", label: "Notificar a administradores" },
                  { key: "notify_directors", label: "Notificar a directores" },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear perfil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
