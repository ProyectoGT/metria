import Image from "next/image";
import Link from "next/link";
import { Playfair_Display, DM_Sans } from "next/font/google";
import LoginFormClient from "./login-form-client";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export default function LoginPage() {
  return (
    <main
      className={`${playfair.variable} ${dmSans.variable} flex min-h-screen`}
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {/* ── Panel izquierdo — 42% ─────────────────────────────────────────── */}
      <section
        className="relative hidden lg:flex lg:w-[42%] lg:flex-col lg:overflow-hidden"
        style={{ backgroundColor: "#0d1b2e" }}
      >
        {/* Círculos decorativos */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
        />

        <div className="relative flex h-full flex-col justify-between px-12 py-10">
          {/* Logo */}
          <div>
            <Image
              src="/logo-bg-master-iberica.png"
              alt="Master Iberica"
              width={220}
              height={64}
              priority
              className="h-auto w-auto max-w-[200px]"
            />
          </div>

          {/* Copy editorial */}
          <div className="space-y-6">
            <div
              className="h-px w-8"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            />

            <h2
              className="text-3xl leading-snug text-white"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              Tu cartera inmobiliaria,
              <br />
              siempre a mano.
            </h2>

            <p
              className="max-w-xs text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Gestiona zonas, propiedades y rendimiento de tu equipo desde un
              único lugar, con sincronización en tiempo real.
            </p>

            {/* Métricas */}
            <div className="flex gap-8">
              <div>
                <p className="text-lg font-semibold text-white">+2.400</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Propiedades
                </p>
              </div>
              <div
                className="w-px self-stretch"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              />
              <div>
                <p className="text-lg font-semibold text-white">98%</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Uptime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Panel derecho — 58% ───────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:w-[58%]">
        <div className="w-full max-w-md space-y-7">
          {/* Píldora */}
          <div className="flex justify-center lg:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-text-secondary">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "#1D9E75" }}
              />
              Acceso privado
            </span>
          </div>

          {/* Logo móvil */}
          <div className="flex justify-center lg:hidden">
            <Image
              src="/logo-bg-master-iberica-black.png"
              alt="Master Iberica"
              width={180}
              height={52}
              priority
              className="h-auto w-auto max-w-[160px]"
            />
          </div>

          {/* Título */}
          <div className="space-y-1.5 text-center lg:text-left">
            <h1
              className="text-4xl text-text-primary"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              Bienvenido
            </h1>
            <p className="text-sm text-text-secondary">
              Inicia sesión para acceder a la plataforma.
            </p>
          </div>

          {/* Formulario */}
          <LoginFormClient />

          {/* Footer legal */}
          <p className="text-center text-[11px] text-text-secondary/60">
            <Link
              href="/legal/privacidad"
              className="underline-offset-2 transition hover:text-text-secondary hover:underline"
            >
              Política de privacidad
            </Link>
            {" · "}
            <Link
              href="/legal/condiciones"
              className="underline-offset-2 transition hover:text-text-secondary hover:underline"
            >
              Condiciones del servicio
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
