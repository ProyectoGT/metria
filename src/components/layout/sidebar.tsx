"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";

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
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-6">
        <span className="text-xl font-bold text-white">Metria</span>
        <span className="text-sm text-slate-400">CRM</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-slate-300 hover:bg-sidebar-hover hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <span className="text-lg">🚪</span>
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
