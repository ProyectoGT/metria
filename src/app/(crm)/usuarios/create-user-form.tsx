"use client";

import { useState, useTransition } from "react";
import { createCrmUserAction } from "./actions";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { Mail, KeyRound } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type SupervisorOption = {
  id: number;
  nombre: string;
  apellidos: string;
  rol: string;
};

type Props = {
  roles: readonly string[];
  supervisors?: SupervisorOption[];
  currentUserRole?: string;
  onSuccess?: (message: string) => void;
};

const initialForm = {
  nombre: "",
  apellidos: "",
  correo: "",
  rol: "Agente",
  supervisorId: null as number | null,
  password: "",
  confirmPassword: "",
};

const DIRECTOR_ALLOWED_ROLES = ["Responsable", "Agente"];

export default function CreateUserForm({ roles, supervisors = [], currentUserRole, onSuccess }: Props) {
  const availableRoles = currentUserRole === "Director"
    ? roles.filter((r) => DIRECTOR_ALLOWED_ROLES.includes(r))
    : roles;
  const [form, setForm] = useState(initialForm);
  const [authMode, setAuthMode] = useState<"password" | "invite" | "google">("password");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsSupervisor = form.rol === "Agente" || form.rol === "Responsable";
  const sendInvite = authMode === "invite";

  function updateField<K extends keyof typeof initialForm>(
    key: K,
    value: (typeof initialForm)[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createCrmUserAction({
        ...form,
        supervisorId: needsSupervisor ? form.supervisorId : null,
        sendInvite,
        googleOnly: authMode === "google",
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setForm(initialForm);
      setAuthMode("password");
      onSuccess?.(result.message ?? "Usuario creado correctamente.");
    });
  }

  const passwordsMatch =
    form.confirmPassword && form.confirmPassword === form.password;
  const passwordsDiffer =
    form.confirmPassword && form.confirmPassword !== form.password;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre">
          <input
            value={form.nombre}
            onChange={(event) => updateField("nombre", event.target.value)}
            className="input"
            placeholder="Nombre"
            required
          />
        </Field>
        <Field label="Apellidos">
          <input
            value={form.apellidos}
            onChange={(event) => updateField("apellidos", event.target.value)}
            className="input"
            placeholder="Apellidos"
            required
          />
        </Field>
      </div>

      <Field label="Correo" hint="Sera el usuario con el que acceda al sistema.">
        <input
          type="email"
          value={form.correo}
          onChange={(event) => updateField("correo", event.target.value)}
          className="input"
          placeholder="usuario@empresa.com"
          autoComplete="email"
          required
        />
      </Field>

      <Field label="Rango">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => updateField("rol", role)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.rol === role
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-background text-text-secondary hover:text-text-primary"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </Field>

      {needsSupervisor && supervisors.length > 0 && (
        <Field label="Supervisor">
          <select
            value={form.supervisorId ?? ""}
            onChange={(e) =>
              updateField("supervisorId", e.target.value ? Number(e.target.value) : null)
            }
            className="input"
          >
            <option value="">Sin supervisor asignado</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.nombre} ${s.apellidos}`.trim()} ({s.rol})
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Toggle: modo de acceso */}
      <Field label="Acceso">
        <div className="grid grid-cols-3 gap-2">
          {([
            { mode: "password", icon: <KeyRound className="h-4 w-4 shrink-0" />, label: "Contrasena" },
            { mode: "invite", icon: <Mail className="h-4 w-4 shrink-0" />, label: "Por correo" },
            { mode: "google", icon: <GoogleIcon />, label: "Solo Google" },
          ] as const).map(({ mode, icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAuthMode(mode)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                authMode === mode
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-background text-text-secondary hover:text-text-primary"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </Field>

      {authMode === "invite" && (
        <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-text-secondary">
          Se enviara un correo a <span className="font-medium text-text-primary">{form.correo || "la direccion indicada"}</span> con un enlace para que el usuario establezca su propia contrasena.
        </div>
      )}

      {authMode === "google" && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-text-secondary">
          <GoogleIcon />
          <span>
            El usuario accede <span className="font-medium text-text-primary">solo con Google</span> usando <span className="font-medium text-text-primary">{form.correo || "el correo indicado"}</span>. No necesita contrasena.
          </span>
        </div>
      )}

      {authMode === "password" && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contrasena">
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                className="input"
                placeholder="Contrasena segura"
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Confirmar contrasena">
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                className="input"
                placeholder="Repite la contrasena"
                autoComplete="new-password"
                required
              />
            </Field>
          </div>

          {form.password && <PasswordChecklist password={form.password} />}

          {passwordsDiffer && (
            <p className="text-xs text-danger">Las contrasenas no coinciden.</p>
          )}
          {passwordsMatch && isPasswordValid(form.password) && (
            <p className="text-xs text-success">Las contrasenas coinciden.</p>
          )}
        </>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {isPending
            ? "Creando..."
            : authMode === "invite" ? "Crear y enviar invitacion"
            : authMode === "google" ? "Crear usuario con Google"
            : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-background px-3 py-2.5">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.id} className="flex items-center gap-2">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                ok ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              {ok ? "✓" : "✕"}
            </span>
            <span className={`text-xs ${ok ? "text-success" : "text-text-secondary"}`}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
