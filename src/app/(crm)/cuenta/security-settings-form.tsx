"use client";

import { useState } from "react";
import { ShieldAlert, Eye, EyeOff, TriangleAlert, Database, FileWarning } from "lucide-react";
import { updateDeleteConfirmationPasswordAction } from "@/app/actions/security";
import type { ConfirmationPasswordStatus } from "@/lib/delete-confirmation-password";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";

type Props = {
  canManageConfirmationPassword: boolean;
  passwordStatus: ConfirmationPasswordStatus;
};

export default function SecuritySettingsForm({
  canManageConfirmationPassword,
  passwordStatus,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  const allFilled = passwordStatus.configured
    ? Boolean(currentPassword && newPassword && confirmPassword)
    : Boolean(newPassword && confirmPassword);

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
    <div className="rounded-2xl border border-warning/20 bg-surface shadow-sm">
      <div className="border-b border-warning/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Zona sensible
            </h2>
            <p className="text-xs text-text-secondary">
              Protege acciones criticas como eliminacion de propiedades, fincas,
              sectores y zonas
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Status indicator */}
        <div className="rounded-xl border border-border/80 bg-background px-4 py-3">
          <div className="flex items-center gap-2.5">
            {passwordStatus.source === "database" && (
              <Database className="h-4 w-4 text-success shrink-0" />
            )}
            {passwordStatus.source === "env" && (
              <FileWarning className="h-4 w-4 text-warning shrink-0" />
            )}
            {passwordStatus.source === "missing" && (
              <TriangleAlert className="h-4 w-4 text-danger shrink-0" />
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                Estado de proteccion
              </p>
              <p className="mt-0.5 text-sm text-text-primary">
                {passwordStatus.source === "database" &&
                  "Configurada en base de datos y gestionable desde esta pantalla."}
                {passwordStatus.source === "env" &&
                  "Configurada por variable de entorno. Al guardar aqui, pasara a base de datos."}
                {passwordStatus.source === "missing" &&
                  "Sin configurar. El Administrador debe definirla antes de usar borrados protegidos."}
              </p>
            </div>
          </div>
        </div>

        {!canManageConfirmationPassword ? (
          <div className="rounded-xl border border-accent/20 bg-accent/8 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <TriangleAlert className="h-4 w-4 text-accent shrink-0" />
              <p className="text-sm text-accent">
                Solo el Administrador puede actualizar la contrasena de confirmacion.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {passwordStatus.configured && (
              <Field label="Contrasena actual">
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input w-full pr-10"
                    placeholder="Introduce la contrasena actual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-text-secondary hover:text-text-primary"
                    tabIndex={-1}
                    aria-label="Mostrar u ocultar contrasena"
                  >
                    {showCurrent ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>
            )}

            <div>
              <Field label="Nueva contrasena">
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input w-full pr-10"
                    placeholder="Contrasena segura"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-text-secondary hover:text-text-primary"
                    tabIndex={-1}
                    aria-label="Mostrar u ocultar contrasena"
                  >
                    {showNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>
              {newPassword && (
                <ul className="mt-2 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(newPassword);
                    return (
                      <li key={rule.id} className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            ok
                              ? "bg-success/15 text-success"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {ok ? "\u2713" : "\u2715"}
                        </span>
                        <span
                          className={`text-xs ${
                            ok ? "text-success" : "text-text-secondary"
                          }`}
                        >
                          {rule.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <Field label="Confirmar nueva contrasena">
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input w-full pr-10"
                  placeholder="Repite la nueva contrasena"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-text-secondary hover:text-text-primary"
                  tabIndex={-1}
                  aria-label="Mostrar u ocultar contrasena"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-danger">
                Las contrasenas no coinciden.
              </p>
            )}
            {confirmPassword &&
              confirmPassword === newPassword &&
              isPasswordValid(newPassword) && (
                <p className="text-xs text-success">
                  Las contrasenas coinciden.
                </p>
              )}

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

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmit}
                disabled={saving || !allFilled}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Guardando..."
                  : "Actualizar contrasena de borrado"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
