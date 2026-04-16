"use client";

import { useState, useTransition } from "react";
import { createCrmUserAction } from "./actions";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";

type Props = {
  roles: readonly string[];
};

const initialForm = {
  nombre: "",
  apellidos: "",
  correo: "",
  rol: "Agente",
  password: "",
  confirmPassword: "",
};

export default function CreateUserForm({ roles }: Props) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    setSuccess(null);

    startTransition(async () => {
      const result = await createCrmUserAction(form);

      if (result.error) {
        setError(result.error);
        return;
      }

      setForm(initialForm);
      setSuccess(
        result.message ??
          "Usuario creado correctamente. Ya puede acceder con el correo y la contrasena indicados."
      );
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-muted px-6 py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
              Alta de acceso
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
              Crear un usuario nuevo
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              El alta crea la cuenta en Supabase Auth y deja el perfil enlazado
              dentro del CRM en un solo paso.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Acceso"
              value="Inmediato"
              description="Sale activo y listo para iniciar sesion."
            />
            <StatCard
              label="Rango inicial"
              value={form.rol}
              description="Rol asignado al crear la cuenta."
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <div className="space-y-6">
            <FormBlock
              title="Identidad"
              description="Datos visibles del perfil dentro del CRM."
            >
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
                    onChange={(event) =>
                      updateField("apellidos", event.target.value)
                    }
                    className="input"
                    placeholder="Apellidos"
                    required
                  />
                </Field>
              </div>

              <Field
                label="Correo"
                hint="Sera el usuario con el que acceda al sistema."
              >
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
            </FormBlock>

            <FormBlock
              title="Permisos"
              description="Rol del nuevo usuario dentro del CRM."
            >
              <div className="flex flex-col gap-2">
                {roles.map((role) => (
                  <RoleOption
                    key={role}
                    role={role}
                    active={form.rol === role}
                    onSelect={() => updateField("rol", role)}
                  />
                ))}
              </div>
            </FormBlock>
          </div>

          <div className="space-y-6">
            <FormBlock
              title="Credenciales"
              description="Contrasena inicial para el primer acceso."
            >
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
                {form.password && (
                  <PasswordChecklist password={form.password} />
                )}
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
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="text-xs text-danger">Las contrasenas no coinciden.</p>
                )}
                {form.confirmPassword && form.confirmPassword === form.password && isPasswordValid(form.password) && (
                  <p className="text-xs text-success">Las contrasenas coinciden.</p>
                )}
              </Field>
            </FormBlock>

            <div className="rounded-2xl border border-border bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
                Resumen
              </p>
              <dl className="mt-4 space-y-3">
                <SummaryRow label="Rango" value={form.rol} />
                <SummaryRow
                  label="Estado inicial"
                  value="Activo"
                />
                <SummaryRow
                  label="Ambito"
                  value="Misma empresa y equipo del administrador"
                />
              </dl>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            {success}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">
            Revisa bien el correo y el rango antes de crear la cuenta.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {isPending ? "Creando usuario..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </section>
  );
}

function FormBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
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
      <label className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>
    </div>
  );
}

const ROLE_META: Record<string, { description: string; color: string; dot: string; activeBg: string; activeBorder: string; activeText: string }> = {
  Administrador: {
    description: "Acceso total y gestion global del CRM.",
    color: "text-text-primary",
    dot: "bg-text-primary",
    activeBg: "bg-text-primary",
    activeBorder: "border-text-primary",
    activeText: "text-background",
  },
  Director: {
    description: "Vision global y control operativo.",
    color: "text-primary",
    dot: "bg-primary",
    activeBg: "bg-primary",
    activeBorder: "border-primary",
    activeText: "text-white",
  },
  Responsable: {
    description: "Gestion de equipo y supervision comercial.",
    color: "text-accent",
    dot: "bg-accent",
    activeBg: "bg-accent",
    activeBorder: "border-accent",
    activeText: "text-white",
  },
  Agente: {
    description: "Trabajo comercial directo con clientes.",
    color: "text-accent",
    dot: "bg-amber-400",
    activeBg: "bg-amber-400",
    activeBorder: "border-amber-400",
    activeText: "text-white",
  },
};

function RoleOption({
  role,
  active,
  onSelect,
}: {
  role: string;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = ROLE_META[role] ?? {
    description: "",
    color: "text-text-secondary",
    dot: "bg-text-secondary",
    activeBg: "bg-primary",
    activeBorder: "border-primary",
    activeText: "text-white",
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
        active
          ? `${meta.activeBorder} ${meta.activeBg} ${meta.activeText}`
          : "border-border bg-surface text-text-primary hover:border-border hover:bg-muted"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          active
            ? "border-current bg-current"
            : "border-text-secondary/40 bg-transparent"
        }`}
      >
        {active && (
          <span className={`h-1.5 w-1.5 rounded-full ${meta.activeBg === "bg-text-primary" ? "bg-background" : "bg-white"}`} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{role}</p>
        <p className={`mt-0.5 text-xs leading-4 ${active ? "opacity-80" : "text-text-secondary"}`}>
          {meta.description}
        </p>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium text-text-primary">{value}</dd>
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1">
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
