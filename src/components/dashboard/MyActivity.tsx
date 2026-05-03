import { Coins, ClipboardList, ShoppingBag, Phone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Rendimiento } from "@/lib/mock/dashboard";

type MyActivityProps = {
  rendimiento: Rendimiento;
  role?: string;
};

type Stat = {
  label: string;
  value: number;
  objetivo: number;
  icon: LucideIcon;
  color: string;         // bar + icon color
  iconBg: string;        // icon container bg
  isCurrency?: boolean;
};

function fmtNum(v: number, isCurrency = false) {
  if (!isCurrency) return String(v);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K €`;
  return `${v} €`;
}

export default function MyActivity({ rendimiento, role }: MyActivityProps) {
  const stats: Stat[] = [
    {
      label: "Facturado",
      value: rendimiento.facturado,
      objetivo: rendimiento.objetivo_facturado,
      icon: Coins,
      color: "text-primary",
      iconBg: "bg-primary/10",
      isCurrency: true,
    },
    {
      label: "Encargos",
      value: rendimiento.encargos,
      objetivo: rendimiento.objetivo_encargos,
      icon: ClipboardList,
      color: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-500/10",
    },
    {
      label: "Ventas",
      value: rendimiento.ventas,
      objetivo: rendimiento.objetivo_ventas,
      icon: ShoppingBag,
      color: "text-success",
      iconBg: "bg-success/10",
    },
    {
      label: "Contactos",
      value: rendimiento.contactos,
      objetivo: rendimiento.objetivo_contactos,
      icon: Phone,
      color: "text-accent",
      iconBg: "bg-accent/10",
    },
  ];

  const visibleStats = stats.filter(
    (s) => !(s.label === "Facturado" && role === "Agente")
  );

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Mi actividad anual</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Tu rendimiento frente a los objetivos del año.
          </p>
        </div>
        <Link
          href="/desarrollo"
          className="text-xs font-medium text-primary transition-colors hover:underline"
        >
          Ver detalle →
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {visibleStats.map((stat) => {
          const pct = stat.objetivo > 0
            ? Math.min(Math.round((stat.value / stat.objetivo) * 100), 100)
            : 0;

          return (
            <div key={stat.label} className="flex flex-col gap-3 bg-surface p-5">
              {/* Icono + valor */}
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary">
                    {fmtNum(stat.value, stat.isCurrency)}
                  </p>
                  <p className="text-[11px] font-medium text-text-secondary">{stat.label}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${stat.color.replace("text-", "bg-")}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[10px] text-text-secondary">
                    Obj: {fmtNum(stat.objetivo, stat.isCurrency)}
                  </p>
                  <p className={`text-[10px] font-semibold ${pct >= 100 ? "text-success" : pct >= 60 ? "text-accent" : "text-text-secondary"}`}>
                    {pct}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
