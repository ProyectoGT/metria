"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { login, loginWithGoogle } from "./actions";

const fieldClassName =
  "w-full border-0 border-b border-[#d8d3cb] bg-transparent px-0 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#b1aba3] focus:border-[#7ba4e0] focus:ring-0";

const URL_ERRORS: Record<string, string> = {
  auth: "Error al iniciar sesion con Google. Intentalo de nuevo.",
  no_profile: "Esta cuenta de Google no tiene acceso al sistema. Contacta con el administrador.",
  disabled: "Tu cuenta esta desactivada. Contacta con el administrador.",
  pending: "Tu cuenta aun no esta verificada. Revisa tu correo y haz clic en el enlace de verificacion.",
  invalid_token: "El enlace de verificacion no es valido o ha caducado. Contacta con el administrador para que te reenvien el correo.",
  verification_failed: "No se pudo activar tu cuenta. Intentalo de nuevo o contacta con el administrador.",
};

const URL_SUCCESS: Record<string, string> = {
  verified: "Cuenta verificada correctamente. Ya puedes iniciar sesion con Google.",
};

export default function LoginForm() {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const urlError = searchParams?.get("error") ? URL_ERRORS[searchParams.get("error")!] ?? null : null;
  const urlSuccess = searchParams?.get("verified") === "true" ? URL_SUCCESS.verified : null;
  const [error, setError] = useState<string | null>(urlError);
  const [success] = useState<string | null>(urlSuccess);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleGoogleLogin() {
    setError(null);
    startGoogleTransition(async () => {
      const result = await loginWithGoogle();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#15803d]">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-[#f2c7c7] bg-[#fff3f3] px-4 py-3 text-sm text-[#b42318]">
          {error}
        </div>
      )}

      {/* Botón Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGooglePending || isPending}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-[#d8d3cb] bg-white px-4 py-2.5 text-sm font-medium text-[#2f2f2f] shadow-sm transition hover:bg-[#f9f8f6] hover:border-[#bbb5ac] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGooglePending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d8d3cb] border-t-[#6f96cf]" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        {isGooglePending ? "Redirigiendo..." : "Continuar con Google"}
      </button>

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e5e0d9]" />
        <span className="text-xs text-[#b1aba3]">o con email</span>
        <div className="h-px flex-1 bg-[#e5e0d9]" />
      </div>

      <form action={handleSubmit} className="space-y-8">
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
          disabled={isPending || isGooglePending}
          className="w-full rounded-full border border-[#9fc0ee] px-4 py-2.5 text-sm font-medium text-[#6f96cf] transition hover:border-[#7ba4e0] hover:text-[#5f8fd4] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Iniciando sesión..." : "Acceder"}
        </button>
      </form>
    </div>
  );
}
