"use client";

import { useState, useTransition } from "react";
import { createCrmUserAction } from "./actions";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";

type Props = {
  roles: readonly string[];
  onSuccess?: (message: string) => void;
};

const initialForm = {
  nombre: "",
  apellidos: "",
  correo: "",
  rol: "Agente",
  password: "",
  confirmPassword: "",
};

export default function CreateUserForm({ roles, onSuccess }: Props) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      const result = await createCrmUserAction(form);

      if (result.error) {
        setError(result.error);
        return;
      }

      setForm(initialForm);
      onSuccess?.(
        result.message ?? "Usuario creado correctamente."
      );
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
          {roles.map((role) => (
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
            onChange={(event) =>
              updateField("confirmPassword", event.target.value)
            }
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
          {isPending ? "Creando..." : "Crear usuario"}
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
