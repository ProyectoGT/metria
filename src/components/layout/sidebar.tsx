"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import type { UserRole } from "@/lib/roles";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Zona / Sectores", href: "/zona", icon: MapPin },
  { label: "Pedidos", href: "/pedidos", icon: ClipboardList },
  { label: "Desarrollo", href: "/desarrollo", icon: TrendingUp },
  { label: "Calendario", href: "/calendario", icon: Calendar },
  { label: "Calculadora", href: "/calculadora", icon: Calculator },
];

const ROLES_WITH_ORDENES: UserRole[] = [
  "Administrador",
  "Director",
  "Responsable",
];

interface Props {
  userRole?: UserRole | null;
}

export default function Sidebar({ userRole }: Props) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("metria-theme", next ? "dark" : "light");
  }

  const showOrdenes = userRole && ROLES_WITH_ORDENES.includes(userRole);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-border bg-sidebar">
      {/* Logo — blue midnight background */}
      <div className="flex h-16 items-center justify-center bg-sidebar-logo px-4">
        <Image
          src="/logo-bg-master-iberica.png"
          alt="Master Ibérica"
          width={160}
          height={40}
          className="h-9 w-auto object-contain"
          priority
        />
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

        {showOrdenes && (
          <Link
            href="/ordenes"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/ordenes")
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary"
            }`}
          >
            <FileText className="h-[18px] w-[18px] shrink-0" />
            Órdenes del día
          </Link>
        )}

        {/* Separator */}
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

      {/* Bottom actions */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
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
    </aside>
  );
}
