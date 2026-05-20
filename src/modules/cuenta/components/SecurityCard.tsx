"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ChevronDown, Eye, EyeOff, Laptop, ArrowRight } from "lucide-react";
import { updatePasswordAction } from "@/app/actions/perfil";
import { PASSWORD_RULES } from "@/lib/password";

export default function SecurityCard() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const allFilled = Boolean(currentPassword && newPassword && confirmPassword);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updatePasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("Contrasena actualizada correctamente.");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Seguridad
            </h2>
            <p className="text-xs text-text-secondary">
              Gestiona tus credenciales de acceso al CRM
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <Link
          href="/cuenta/dispositivos"
          className="mb-2 flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-2 text-left transition-colors hover:bg-background"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-text-secondary">
              <Laptop className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Mis dispositivos
              </p>
              <p className="text-xs text-text-secondary">
                Gestiona sesiones y dispositivos de confianza
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-text-secondary" />
        </Link>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-2 text-left transition-colors hover:bg-background"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-text-secondary">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Cambiar contrasena
              </p>
              <p className="text-xs text-text-secondary">
                Actualiza la contrasena de acceso al CRM
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-text-secondary transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            <PasswordField
              label="Contrasena actual"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
            />

            <div>
              <PasswordField
                label="Nueva contrasena"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
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

            <PasswordField
              label="Confirmar nueva contrasena"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
            />

            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-danger">
                Las contrasenas no coinciden.
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

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || !allFilled}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Actualizar contrasena"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input w-full pr-10"
          placeholder=""
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-text-secondary hover:text-text-primary"
          tabIndex={-1}
          aria-label={show ? "Ocultar contrasena" : "Mostrar contrasena"}
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
