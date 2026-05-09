// ─── DashboardQuickActions ───────────────────────────────────────────────────
// Fila de accesos rápidos en el dashboard para las acciones más comunes.

import Link from "next/link";
import {
  MapPin,
  ClipboardList,
  BookUser,
  Calendar,
  FileText,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/roles";

type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
  roles?: UserRole[];
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Zona",        href: "/zona",        icon: MapPin,        color: "text-primary        bg-primary/8" },
  { label: "Solicitudes", href: "/solicitudes", icon: ClipboardList, color: "text-purple-600     bg-purple-500/8 dark:text-purple-400" },
  { label: "Contactos",   href: "/contactos",   icon: BookUser,      color: "text-teal-600       bg-teal-500/8   dark:text-teal-400" },
  { label: "Calendario",  href: "/calendario",  icon: Calendar,      color: "text-success        bg-success/8" },
  { label: "Ordenes",     href: "/ordenes",     icon: FileText,      color: "text-accent         bg-accent/8" },
  { label: "Desarrollo",  href: "/desarrollo",  icon: BarChart3,     color: "text-blue-600       bg-blue-500/8   dark:text-blue-400" },
];

export default function DashboardQuickActions({ role }: { role: UserRole }) {
  const actions = QUICK_ACTIONS.filter((action) => !action.roles || action.roles.includes(role));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-all duration-200 hover:border-secondary/35 hover:shadow-md"
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${a.color}`}
          >
            <a.icon className="h-5 w-5" />
          </div>
          <span className="text-center text-xs font-medium text-text-secondary group-hover:text-text-primary">
            {a.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
