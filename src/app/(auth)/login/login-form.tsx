"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { login } from "./actions";

const fieldClassName =
  "w-full border-0 border-b border-[#d8d3cb] bg-transparent px-0 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#b1aba3] focus:border-[#7ba4e0] focus:ring-0";

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
    <form action={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-[#f2c7c7] bg-[#fff3f3] px-4 py-3 text-sm text-[#b42318]">
          {error}
        </div>
      )}

      <div className="space-y-7">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-[#2f2f2f]"
          >
            Usuario o Email
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

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#2f2f2f]"
            >
              Contraseña
            </label>
            <Link
              href="/recuperar"
              className="text-xs font-medium text-[#7ba4e0] transition hover:text-[#5f8fd4]"
            >
              ¿Has olvidado tu contraseña?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Introduce tu contraseña"
            className={fieldClassName}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full border border-[#9fc0ee] px-4 py-2.5 text-sm font-medium text-[#6f96cf] transition hover:border-[#7ba4e0] hover:text-[#5f8fd4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Iniciando sesión..." : "Acceder"}
      </button>
    </form>
  );
}
