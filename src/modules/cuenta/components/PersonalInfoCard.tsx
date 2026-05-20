"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Circle, Clock } from "lucide-react";
import { updateProfileAction } from "@/app/actions/perfil";
import { ROL_BADGE, ESTADO_USUARIO, ESTADO_USUARIO_LABEL } from "@/lib/theme";
import type { UserRole } from "@/lib/roles";

type UserStatus = "active" | "invited" | "disabled";

type Props = {
  initialNombre: string;
  email: string;
  rol: UserRole;
  status?: UserStatus;
};

export default function PersonalInfoCard({
  initialNombre,
  email,
  rol,
  status = "active",
}: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(initialNombre);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dirty = nombre !== initialNombre;
  const statusLabel = ESTADO_USUARIO_LABEL[status] ?? "Activo";
  const statusClass = ESTADO_USUARIO[status] ?? ESTADO_USUARIO.active;
  const roleClass = ROL_BADGE[rol] ?? "bg-primary/10 text-primary";

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

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Datos personales
            </h2>
            <p className="text-xs text-text-secondary">
              Informacion basica de tu cuenta
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        <InfoRow icon={<User className="h-4 w-4" />} label="Nombre">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-text-primary outline-none"
          />
        </InfoRow>

        <InfoRow icon={<Mail className="h-4 w-4" />} label="Correo">
          <span className="text-sm font-medium text-text-secondary">
            {email}
          </span>
        </InfoRow>

        <InfoRow icon={<Shield className="h-4 w-4" />} label="Rol">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleClass}`}
          >
            {rol}
          </span>
        </InfoRow>

        <InfoRow icon={<Circle className="h-4 w-4" />} label="Estado">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
          >
            <Circle className="h-2 w-2 fill-current" />
            {statusLabel}
          </span>
        </InfoRow>

        <InfoRow icon={<Clock className="h-4 w-4" />} label="Ultima actividad">
          <span className="text-sm text-text-secondary">—</span>
        </InfoRow>
      </div>

      {error && (
        <div className="px-5 pb-4 pt-3">
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="px-5 pb-4 pt-3">
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            {success}
          </p>
        </div>
      )}

      {dirty && (
        <div className="border-t border-border px-5 py-4">
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-text-secondary">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary shrink-0">
          {label}
        </span>
        <div className="min-w-0 text-right">{children}</div>
      </div>
    </div>
  );
}
