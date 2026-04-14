import Image from "next/image";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: ReactNode;
  children: ReactNode;
  eyebrow?: string;
};

export default function AuthShell({
  title,
  description,
  children,
  eyebrow = "Acceso privado",
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#f4f2ee] lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#050505] lg:flex lg:min-h-screen lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.05),_transparent_28%)]" />
        <div className="relative flex w-full max-w-xl items-center justify-center px-16">
          <Image
            src="/logo-bg-master-iberica.png"
            alt="Master Iberica"
            width={420}
            height={120}
            priority
            className="h-auto w-full max-w-[360px] xl:max-w-[420px]"
          />
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <div className="mb-10 space-y-3">
            <div className="lg:hidden">
              <Image
                src="/logo-bg-master-iberica.png"
                alt="Master Iberica"
                width={220}
                height={64}
                priority
                className="h-auto w-auto max-w-[220px]"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8d867c]">
                {eyebrow}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[#171717]">
                {title}
              </h1>
              <div className="max-w-sm text-sm leading-6 text-[#6f6a63]">
                {description}
              </div>
            </div>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}
