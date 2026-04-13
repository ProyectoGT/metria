"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import type { Theme, Layout } from "./app-shell";

const navItems = [
  { label: "Dashboard",   href: "/dashboard",   icon: "📊" },
  { label: "Zona",        href: "/zona",         icon: "📍" },
  { label: "Pedidos",     href: "/pedidos",      icon: "📋" },
  { label: "Desarrollo",  href: "/desarrollo",   icon: "🏗️" },
  { label: "Calendario",  href: "/calendario",   icon: "📅" },
  { label: "Calculadora", href: "/calculadora",  icon: "🧮" },
];

interface Props {
  theme:           Theme;
  layout:          Layout;
  onToggleTheme:   () => void;
  onToggleLayout:  () => void;
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function SidebarLayoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M9 3h10a2 2 0 012 2v14a2 2 0 01-2 2H9M9 3v18" />
    </svg>
  );
}

export default function Topnav({ theme, layout, onToggleTheme, onToggleLayout }: Props) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-surface px-4 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-1.5 pr-6">
        <span className="text-base font-bold text-text-primary">Metria</span>
        <span className="text-xs text-text-secondary">CRM</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-background hover:text-text-primary"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-1 pl-4">
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
          <span className="hidden sm:inline">{theme === "light" ? "Oscuro" : "Claro"}</span>
        </button>

        {/* Layout toggle */}
        <button
          onClick={onToggleLayout}
          title="Cambiar a menú lateral"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
        >
          <SidebarLayoutIcon />
          <span className="hidden sm:inline">Lateral</span>
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* Logout */}
        <form action={logout}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </div>
    </header>
  );
}
