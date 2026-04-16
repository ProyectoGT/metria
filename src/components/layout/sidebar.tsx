"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { canManageUsers, normalizeUserRole } from "@/lib/roles";
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  TrendingUp,
  Calendar,
  Calculator,
  FileText,
  LifeBuoy,
  Moon,
  Sun,
  Users,
  X,
} from "lucide-react";

const baseNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Zona / Sectores", href: "/zona", icon: MapPin },
  { label: "Solicitudes", href: "/solicitudes", icon: ClipboardList },
  { label: "Desarrollo", href: "/desarrollo", icon: TrendingUp },
  { label: "Calendario", href: "/calendario", icon: Calendar },
  { label: "Órdenes del día", href: "/ordenes", icon: FileText },
  { label: "Calculadora", href: "/calculadora", icon: Calculator },
];

interface Props {
  userRole?: string | null;
}

export default function Sidebar({ userRole: _userRole }: Props) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = _userRole ? normalizeUserRole(_userRole) : null;
  const navItems = canManageUsers(userRole ?? "Agente")
    ? [...baseNavItems, { label: "Usuarios", href: "/usuarios", icon: Users }]
    : baseNavItems;

  // Escuchar evento del botón hamburger en el header
  useEffect(() => {
    function handleToggle() {
      setMobileOpen((prev) => !prev);
    }
    window.addEventListener("sidebar:toggle", handleToggle);
    return () => window.removeEventListener("sidebar:toggle", handleToggle);
  }, []);

  // Cerrar al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("metria-theme", next ? "dark" : "light");
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="relative flex h-16 items-center justify-center bg-sidebar-logo px-2">
        <Image
          src="/logo-bg-master-iberica.png"
          alt="Master Ibérica"
          width={240}
          height={56}
          className="h-20 w-auto object-contain"
          priority
        />
        {/* Cerrar drawer — solo en móvil */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 rounded-lg p-1.5 text-white/70 hover:bg-white/10 md:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-border" />

        <Link
          href="/soporte"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith("/soporte")
              ? "bg-primary text-white"
              : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary"
          }`}
        >
          <LifeBuoy className="h-[18px] w-[18px] shrink-0" />
          Soporte
        </Link>
      </nav>

      {/* Tema */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <p className="px-3 pb-1 text-[10px] font-medium text-text-secondary/50 tracking-widest uppercase">
          v0.8.0 Beta
        </p>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-sidebar-hover hover:text-text-primary"
        >
          {dark ? (
            <Sun className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <Moon className="h-[18px] w-[18px] shrink-0" />
          )}
          {dark ? "Modo claro" : "Modo oscuro"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop: sidebar fijo siempre visible ────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] flex-col border-r border-border bg-sidebar md:flex">
        {navContent}
      </aside>

      {/* ── Móvil: overlay + drawer deslizante ──────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-border bg-sidebar transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
