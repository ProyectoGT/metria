"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { translateVisibleText } from "@/lib/i18n/translate-text";

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
  const renderedDescription = typeof description === "string" ? translateVisibleText(description) : description;

  return (
    <main className="min-h-screen bg-[#f4f2ee] transition-colors dark:bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#050505] dark:bg-sidebar-logo lg:flex lg:min-h-screen lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.05),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.10),_transparent_30%)]" />
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
        <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-colors dark:border-border dark:bg-surface dark:shadow-xl sm:rounded-[2rem] sm:p-8 md:p-10">
          <div className="mb-4 space-y-1">
            <div className="mb-1 flex justify-center lg:hidden">
              <Image
                src="/logo-bg-master-iberica-black.png"
                alt="Master Iberica"
                width={220}
                height={64}
                priority
                className="h-36 w-auto mix-blend-multiply"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8d867c] dark:text-text-secondary">
                {translateVisibleText(eyebrow)}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[#171717] dark:text-text-primary">
                {translateVisibleText(title)}
              </h1>
              <div className="max-w-sm text-sm leading-6 text-[#6f6a63] dark:text-text-secondary">
                {renderedDescription}
              </div>
            </div>
          </div>

          {children}

          {/* Legal links */}
          <p className="mt-8 text-center text-[11px] text-[#b1aba3] dark:text-text-secondary/60">
            <Link
              href="/legal/privacidad"
              className="underline-offset-2 transition-colors hover:text-[#8d867c] hover:underline dark:hover:text-text-secondary"
            >
              Politica de privacidad
            </Link>
            {" · "}
            <Link
              href="/legal/condiciones"
              className="underline-offset-2 transition-colors hover:text-[#8d867c] hover:underline dark:hover:text-text-secondary"
            >
              Condiciones del servicio
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
