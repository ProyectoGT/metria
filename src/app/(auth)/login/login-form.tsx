"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { login } from "./actions";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text-primary"
          >
            Contraseña
          </label>
          <Link
            href="/recuperar"
            className="text-xs font-medium text-primary hover:text-primary-dark"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
