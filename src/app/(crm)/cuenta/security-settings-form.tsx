"use client";

import { useState } from "react";
import { updateDeleteConfirmationPasswordAction } from "@/app/actions/security";
import type { ConfirmationPasswordStatus } from "@/lib/delete-confirmation-password";
import type { UserRole } from "@/lib/roles";

type Props = {
  currentRole: UserRole;
  canManageConfirmationPassword: boolean;
  passwordStatus: ConfirmationPasswordStatus;
};

export default function SecuritySettingsForm({
  currentRole,
  canManageConfirmationPassword,
  passwordStatus,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateDeleteConfirmationPasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaving(false);
    setSuccess("Contrasena de confirmacion actualizada correctamente.");
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Seguridad de borrado
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Esta contrasena se pedira para eliminar propiedades, fincas, sectores
            y zonas.
          </p>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-text-secondary">
          {currentRole}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-border/80 bg-background px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Estado actual
        </p>
        <p className="mt-1 text-sm text-text-primary">
          {passwordStatus.source === "database" &&
            "Configurada en base de datos y gestionable desde esta pantalla."}
          {passwordStatus.source === "env" &&
            "Configurada por variable de entorno. Al guardar aqui, pasara a base de datos."}
          {passwordStatus.source === "missing" &&
            "Sin configurar todavia. El Administrador debe definirla antes de usar borrados protegidos."}
        </p>
      </div>

      {!canManageConfirmationPassword ? (
        <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          Solo el Administrador puede actualizar la contrasena de confirmacion.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {passwordStatus.configured && (
            <Field label="Contrasena actual">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
                placeholder="Introduce la contrasena actual"
              />
            </Field>
          )}

          <Field label="Nueva contrasena">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Minimo 8 caracteres"
            />
          </Field>

          <Field label="Confirmar nueva contrasena">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Repite la nueva contrasena"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              {success}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Actualizar contrasena"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  );
}
