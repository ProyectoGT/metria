"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { resetPassword } from "./actions";

export default function RecuperarForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4 text-sm text-success">
          Te hemos enviado un correo con las instrucciones para restablecer tu
          contraseña.
        </div>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-primary hover:text-primary-dark"
        >
          Volver al login
        </Link>
      </div>
    );
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

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:text-primary-dark"
        >
          Volver al login
        </Link>
      </div>
    </form>
  );
}
