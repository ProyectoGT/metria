"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resetPassword } from "./actions";

const fieldClassName =
  "w-full border-0 border-b border-[#d8d3cb] bg-transparent px-0 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#b1aba3] focus:border-[#7ba4e0] focus:ring-0";

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
      <div className="space-y-8">
        <div className="rounded-2xl border border-[#cfe8d3] bg-[#f3fbf4] px-4 py-4 text-sm leading-6 text-[#28643a]">
          Te hemos enviado un correo con las instrucciones para restablecer tu
          contraseña.
        </div>
        <Link
          href="/login"
          className="inline-flex w-full justify-center rounded-full border border-[#9fc0ee] px-4 py-2.5 text-sm font-medium text-[#6f96cf] transition hover:border-[#7ba4e0] hover:text-[#5f8fd4]"
        >
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-[#f2c7c7] bg-[#fff3f3] px-4 py-3 text-sm text-[#b42318]">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-[#2f2f2f]"
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
          className={fieldClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full border border-[#9fc0ee] px-4 py-2.5 text-sm font-medium text-[#6f96cf] transition hover:border-[#7ba4e0] hover:text-[#5f8fd4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-[#7ba4e0] transition hover:text-[#5f8fd4]"
        >
          Volver al login
        </Link>
      </div>
    </form>
  );
}
