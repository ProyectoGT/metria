"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  MapPin,
  Building2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Hoy" },
  { href: "/ordenes", icon: ClipboardList, label: "Orden" },
  { href: "/calendario", icon: Calendar, label: "Calendario" },
  { href: "/zona", icon: MapPin, label: "Zonas" },
  { href: "/propiedades", icon: Building2, label: "Props" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/zona") return pathname === "/zona" || pathname.startsWith("/zona/");
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-surface shadow-layer-2 md:hidden"
      aria-label="Navegación móvil"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors min-h-[44px] min-w-[48px] ${
              active
                ? "text-primary"
                : "text-text-secondary/70 hover:text-text-primary"
            }`}
          >
            <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
            <span>{item.label}</span>
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
