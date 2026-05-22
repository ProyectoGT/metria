"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { login, loginWithGoogle } from "./actions";

const URL_ERRORS: Record<string, string> = {
  auth: "Error al iniciar sesión con Google. Inténtalo de nuevo.",
  no_profile: "Esta cuenta de Google no tiene acceso al sistema. Contacta con el administrador.",
  disabled: "Tu cuenta está desactivada. Contacta con el administrador.",
  pending: "Tu cuenta aún no está verificada. Revisa tu correo.",
  invalid_token: "El enlace de verificación no es válido o ha caducado.",
  verification_failed: "No se pudo activar tu cuenta. Inténtalo de nuevo.",
};

const URL_SUCCESS: Record<string, string> = {
  verified: "Cuenta verificada correctamente. Ya puedes iniciar sesión.",
};

const fieldClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-secondary hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function LoginFormClient() {
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const urlError = searchParams?.get("error")
    ? (URL_ERRORS[searchParams.get("error")!] ?? null)
    : null;
  const urlSuccess =
    searchParams?.get("verified") === "true" ? URL_SUCCESS.verified : null;

  const [error, setError] = useState<string | null>(urlError);
  const [success] = useState<string | null>(urlSuccess);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await login(formData);
        if (result?.error) setError(result.error);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError("Error inesperado. Inténtalo de nuevo.");
      }
    });
  }

  function handleGoogleLogin() {
    setError(null);
    startGoogleTransition(async () => {
      try {
        const result = await loginWithGoogle();
        if (result?.error) setError(result.error);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError("Error inesperado. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Botón Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGooglePending || isPending}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGooglePending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        {isGooglePending ? "Redirigiendo…" : "Continuar con Google"}
      </button>

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-secondary">o con email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            className={fieldClass}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-text-primary">
              Contraseña
            </label>
            <Link
              href="/recuperar"
              className="text-xs font-medium text-text-secondary transition hover:text-text-primary"
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
            className={fieldClass}
          />
        </div>

        <button
          type="submit"
          disabled={isPending || isGooglePending}
          className="mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "#0d1b2e" }}
        >
          {isPending ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
