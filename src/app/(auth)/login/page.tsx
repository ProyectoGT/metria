import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { Playfair_Display, DM_Sans } from "next/font/google";
import LoginFormClient, { type RecentSession } from "./login-form-client";

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

export default async function LoginPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("recent_sessions")?.value;
  let sessions: RecentSession[] = [];
  try { sessions = JSON.parse(raw ?? "[]"); } catch { /* cookie malformada */ }

  return (
    <main
      className={`${playfair.variable} ${dmSans.variable} flex min-h-screen`}
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {/* ── Panel izquierdo 42% ──────────────────────────────────────────── */}
      <section
        className="relative hidden lg:block lg:w-[42%]"
        style={{ backgroundColor: "#0d1b2e" }}
      >
        {/* Círculos decorativos */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.03]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-white/[0.03]" />

        {/* Logo centrado absolutamente */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Image
            src="/logo-bg-master-iberica.png"
            alt="Master Iberica"
            width={380}
            height={108}
            priority
            className="h-auto w-auto max-w-[340px]"
          />
        </div>

        {/* Copy editorial en la parte inferior */}
        <div className="absolute bottom-0 left-0 right-0 px-12 pb-12">
          <div className="mb-5 h-px w-8 bg-white/15" />
          <h2
            className="mb-4 text-[1.75rem] leading-snug text-white"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Tu cartera inmobiliaria,
            <br />
            siempre a mano.
          </h2>
          <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/45">
            Gestiona zonas, propiedades y rendimiento de tu equipo desde un
            único lugar, con sincronización en tiempo real.
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-lg font-semibold text-white">+2.400</p>
              <p className="text-xs text-white/45">Propiedades</p>
            </div>
            <div className="w-px self-stretch bg-white/12" />
            <div>
              <p className="text-lg font-semibold text-white">98%</p>
              <p className="text-xs text-white/45">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Panel derecho 58% ────────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 lg:w-[58%]">
        <div className="w-full max-w-[340px] space-y-6">
          {/* Píldora */}
          <div className="flex justify-center lg:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#1D9E75" }} />
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

          {/* Formulario (título + sesiones + campos dentro) */}
          <LoginFormClient initialSessions={sessions} />

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
