"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import type { Theme, Layout } from "./app-shell";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Zona", href: "/zona", icon: "📍" },
  { label: "Pedidos", href: "/pedidos", icon: "📋" },
  { label: "Desarrollo", href: "/desarrollo", icon: "🏗️" },
  { label: "Calendario", href: "/calendario", icon: "📅" },
  { label: "Calculadora", href: "/calculadora", icon: "🧮" },
  { label: "Cuenta", href: "/cuenta", icon: "👤" },
];

interface Props {
  theme: Theme;
  layout: Layout;
  onToggleTheme: () => void;
  onToggleLayout: () => void;
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function TopnavIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h10M4 18h10"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

export default function Sidebar({
  theme,
  layout: _layout,
  onToggleTheme,
  onToggleLayout,
}: Props) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-1.5 px-5">
        <span className="text-base font-bold text-text-primary">Metria</span>
        <span className="text-xs text-text-secondary">CRM</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-background hover:text-text-primary"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          >
            <LogoutIcon />
            Cerrar sesión
          </button>
        </form>

        <div className="mt-1 border-t border-border pt-3">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-secondary opacity-60">
            Vista
          </p>
          <div className="flex gap-1">
            <button
              onClick={onToggleTheme}
              title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
              <span>{theme === "light" ? "Oscuro" : "Claro"}</span>
            </button>

            <button
              onClick={onToggleLayout}
              title="Cambiar a menú superior"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            >
              <TopnavIcon />
              <span>Superior</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
