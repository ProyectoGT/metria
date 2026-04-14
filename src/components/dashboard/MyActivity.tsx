import { Coins, ClipboardList, ShoppingBag, Phone, type LucideIcon } from "lucide-react";
import type { Rendimiento } from "@/lib/mock/dashboard";

type MyActivityProps = {
  rendimiento: Rendimiento;
};

type Stat = {
  label: string;
  value: number;
  objetivo: number;
  icon: LucideIcon;
  bg: string;
  fg: string;
  isCurrency?: boolean;
};

function fmtNum(v: number, isCurrency = false) {
  if (!isCurrency) return String(v);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K €`;
  return `${v} €`;
}

export default function MyActivity({ rendimiento }: MyActivityProps) {
  const stats: Stat[] = [
    {
      label: "Facturado",
      value: rendimiento.facturado,
      objetivo: rendimiento.objetivo_facturado,
      icon: Coins,
      bg: "bg-blue-100",
      fg: "text-blue-600",
      isCurrency: true,
    },
    {
      label: "Encargos",
      value: rendimiento.encargos,
      objetivo: rendimiento.objetivo_encargos,
      icon: ClipboardList,
      bg: "bg-purple-100",
      fg: "text-purple-600",
    },
    {
      label: "Ventas",
      value: rendimiento.ventas,
      objetivo: rendimiento.objetivo_ventas,
      icon: ShoppingBag,
      bg: "bg-green-100",
      fg: "text-green-600",
    },
    {
      label: "Contactos",
      value: rendimiento.contactos,
      objetivo: rendimiento.objetivo_contactos,
      icon: Phone,
      bg: "bg-orange-100",
      fg: "text-orange-600",
    },
  ];

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-semibold text-text-primary">Mi actividad</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Tu rendimiento anual frente a los objetivos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const pct = stat.objetivo > 0 ? Math.min(Math.round((stat.value / stat.objetivo) * 100), 100) : 0;
          return (
            <div key={stat.label} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg} ${stat.fg}`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary">
                    {fmtNum(stat.value, stat.isCurrency)}
                  </p>
                  <p className="text-xs text-text-secondary">{stat.label}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                  <div
                    className={stat.fg.replace("text-", "bg-")}
                    style={{ width: `${pct}%`, height: "100%", transition: "width 0.6s ease" }}
                  />
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {pct}% del objetivo ({fmtNum(stat.objetivo, stat.isCurrency)})
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
