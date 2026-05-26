"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login, loginWithGoogle } from "./actions";

export type RecentSession = {
  name: string;
  email: string;
  avatarInitials: string;
};

const AVATAR_COLORS = ["#0d1b2e", "#1D9E75"];
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const URL_ERRORS: Record<string, string> = {
  auth: "Error al iniciar sesión con Google. Inténtalo de nuevo.",
  no_profile: "Esta cuenta de Google no tiene acceso al sistema. Contacta con el administrador.",
  disabled: "Tu cuenta está desactivada. Contacta con el administrador.",
  pending: "Tu cuenta aún no está verificada. Revisa tu correo.",
  invalid_token: "El enlace de verificación no es válido o ha caducado.",
  verification_failed: "No se pudo activar tu cuenta. Inténtalo de nuevo.",
};

const fieldClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-secondary hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20";

interface Props {
  initialSessions: RecentSession[];
}

export default function LoginFormClient({ initialSessions }: Props) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const urlError = searchParams?.get("error")
    ? (URL_ERRORS[searchParams.get("error")!] ?? null)
    : null;
  const urlSuccess =
    searchParams?.get("verified") === "true"
      ? "Cuenta verificada correctamente. Ya puedes iniciar sesión."
      : null;

  const router = useRouter();
  const [sessions, setSessions] = useState<RecentSession[]>(initialSessions);
  const [error, setError] = useState<string | null>(urlError);
  const [success] = useState<string | null>(urlSuccess);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  const hasSessions = sessions.length > 0;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await login(formData);
        if (result?.error) setError(result.error);
        else if (result?.redirectTo) router.push(result.redirectTo);
      } catch {
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
        else if (result?.redirectTo) window.location.href = result.redirectTo;
      } catch {
        setError("Error inesperado. Inténtalo de nuevo.");
      }
    });
  }

  function selectSession(session: RecentSession) {
    if (emailRef.current) emailRef.current.value = session.email;
    passwordRef.current?.focus();
  }

  function removeSession(email: string) {
    const updated = sessions.filter((s) => s.email !== email);
    setSessions(updated);
    document.cookie = `recent_sessions=${encodeURIComponent(
      JSON.stringify(updated)
    )}; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; samesite=lax`;
  }

  return (
    <div className="space-y-5">
      {/* Título + subtítulo */}
      <div className="space-y-1 text-center lg:text-left">
        <h1
          className="text-4xl text-text-primary"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Bienvenido
        </h1>
        <p className="text-sm text-text-secondary">
          {hasSessions
            ? "Elige una cuenta o inicia sesión con otra."
            : "Inicia sesión para acceder a la plataforma."}
        </p>
      </div>

      {/* Alertas */}
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

      {/* Sesiones recientes */}
      {hasSessions && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
            Sesiones recientes
          </p>
          <div className="overflow-hidden rounded-xl border border-border">
            {sessions.map((session, i) => (
              <div
                key={session.email}
                className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
              >
                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => selectSession(session)}
                  className="flex flex-1 items-center gap-3 text-left"
                  title={`Usar ${session.email}`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: AVATAR_COLORS[i % 2] }}
                  >
                    {session.avatarInitials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {session.name}
                    </p>
                    <p className="truncate text-xs text-text-secondary">
                      {session.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-text-secondary">›</span>
                </button>
                {/* Eliminar sesión */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSession(session.email); }}
                  className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-text-secondary transition hover:bg-muted hover:text-text-primary"
                  title="Eliminar sesión"
                  aria-label={`Eliminar sesión de ${session.email}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Separador "usar otra cuenta" */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-secondary">usar otra cuenta</span>
            <div className="h-px flex-1 bg-border" />
          </div>
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

      {/* Separador o con email */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-secondary">o con email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Formulario email + contraseña */}
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
            Correo electrónico
          </label>
          <input
            ref={emailRef}
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
            ref={passwordRef}
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
