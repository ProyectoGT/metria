"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Lock } from "lucide-react";
import AvatarUpload from "./AvatarUpload";
import { updateProfileAction, updatePasswordAction } from "@/app/actions/perfil";

type Props = {
  authUserId: string;
  initialNombre: string;
  email: string;
  rol: string;
  initialAvatarUrl: string | null;
};

export default function AccountProfileCard({
  authUserId,
  initialNombre,
  email,
  rol,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();

  const [nombre, setNombre] = useState(initialNombre);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dirty = nombre !== initialNombre;

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateProfileAction({ nombre });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess("Cambios guardados correctamente.");
    router.refresh();
  }

  async function handlePasswordSave() {
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(null);

    const result = await updatePasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setPwSaving(false);

    if (result.error) {
      setPwError(result.error);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwSuccess("Contraseña actualizada correctamente.");
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-base font-semibold text-text-primary">
        Usuario actual
      </h2>

      {/* Foto de perfil */}
      <div className="mt-5">
        <AvatarUpload
          userId={authUserId}
          userName={nombre || "Usuario"}
          initialAvatarUrl={initialAvatarUrl}
        />
      </div>

      {/* Datos */}
      <div className="mt-5 space-y-4">
        <FloatingField label="Nombre">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-text-primary outline-none"
          />
        </FloatingField>

        <FloatingField label="Correo">
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full cursor-not-allowed bg-transparent text-sm font-medium text-text-primary opacity-80 outline-none"
          />
        </FloatingField>

        <FloatingField label="Rol">
          <input
            type="text"
            value={rol}
            readOnly
            disabled
            className="w-full cursor-not-allowed bg-transparent text-sm font-medium text-text-primary opacity-80 outline-none"
          />
        </FloatingField>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </p>
      )}

      {dirty && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}

      {/* Separador */}
      <div className="my-6 border-t border-border" />

      {/* Cambiar contraseña — colapsable */}
      <button
        onClick={() => setPwOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-text-secondary">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Cambiar contraseña
            </p>
            <p className="text-xs text-text-secondary">
              Actualiza la contraseña de acceso al CRM
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-text-secondary transition-transform ${pwOpen ? "rotate-180" : ""}`}
        />
      </button>

      {pwOpen && (
        <div className="mt-4 space-y-4">
          <FloatingField label="Contraseña actual">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-text-primary outline-none"
            />
          </FloatingField>

          <FloatingField label="Nueva contraseña">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-text-primary outline-none"
            />
          </FloatingField>

          <FloatingField label="Confirmar nueva contraseña">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-text-primary outline-none"
            />
          </FloatingField>

          {pwError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {pwSuccess}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handlePasswordSave}
              disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {pwSaving ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function FloatingField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
