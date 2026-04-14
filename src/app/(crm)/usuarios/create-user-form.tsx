"use client";

import { useState, useTransition } from "react";
import { createCrmUserAction } from "./actions";

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
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-surface shadow-sm">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef4ff_45%,#f9fafb_100%)] px-6 py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Alta de acceso
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Crear un usuario nuevo
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
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
              <Field label="Rango">
                <select
                  value={form.rol}
                  onChange={(event) => updateField("rol", event.target.value)}
                  className="input"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-3 md:grid-cols-3">
                <RoleInfo
                  title="Administrador"
                  description="Acceso total y gestion global del CRM."
                  active={form.rol === "Administrador"}
                  tone="dark"
                />
                <RoleInfo
                  title="Director"
                  description="Vision global y control operativo."
                  active={form.rol === "Director"}
                  tone="blue"
                />
                <RoleInfo
                  title="Responsable / Agente"
                  description="Gestion de equipo o trabajo comercial directo."
                  active={
                    form.rol === "Responsable" || form.rol === "Agente"
                  }
                  tone="amber"
                />
              </div>
            </FormBlock>
          </div>

          <div className="space-y-6">
            <FormBlock
              title="Credenciales"
              description="Contrasena inicial para el primer acceso."
            >
              <Field
                label="Contrasena"
                hint="Minimo 8 caracteres."
              >
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  className="input"
                  placeholder="Minimo 8 caracteres"
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
            </FormBlock>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">
            Revisa bien el correo y el rango antes de crear la cuenta.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
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
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
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
    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function RoleInfo({
  title,
  description,
  active,
  tone,
}: {
  title: string;
  description: string;
  active: boolean;
  tone: "dark" | "blue" | "amber";
}) {
  const className =
    tone === "dark"
      ? active
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-slate-50 text-slate-700"
      : tone === "blue"
        ? active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-blue-200 bg-blue-50 text-blue-800"
        : active
          ? "border-amber-500 bg-amber-500 text-white"
          : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={`rounded-xl border px-4 py-3 ${className}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 opacity-90">{description}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
