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
  puesto: "",
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
        "Usuario creado correctamente. Ya puede acceder con el correo y la contrasena indicados."
      );
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Alta de usuario
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Esta cuenta se creara en Supabase Auth y se vinculara con la tabla
            de usuarios del CRM.
          </p>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-text-secondary">
          Solo administrador
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Field label="Correo">
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

          <Field label="Rol">
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
        </div>

        <Field label="Puesto">
          <input
            value={form.puesto}
            onChange={(event) => updateField("puesto", event.target.value)}
            className="input"
            placeholder="Opcional. Si lo dejas vacio, se usara el rol."
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contrasena">
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
        </div>

        <div className="rounded-xl border border-border/80 bg-background px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Alcance
          </p>
          <p className="mt-1 text-sm text-text-primary">
            El nuevo usuario se asignara a tu misma empresa y equipo actuales.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {isPending ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
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
