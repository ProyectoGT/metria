import type { AgentMetrics } from "@/lib/mock/dashboard";

type AgentPerformanceTableProps = {
  agents: AgentMetrics[];
  role: string;
};

const RADIUS = 18;
const CIRC = 2 * Math.PI * RADIUS;

const ALL_METRICS = [
  { key: "contactos", obj: "objetivo_contactos", label: "Contactos", color: "var(--color-accent)", isCurrency: false, adminOnly: false },
  { key: "encargos", obj: "objetivo_encargos", label: "Encargos", color: "#7c3aed", isCurrency: false, adminOnly: false },
  { key: "ventas", obj: "objetivo_ventas", label: "Ventas", color: "var(--color-success)", isCurrency: false, adminOnly: false },
  { key: "facturado", obj: "objetivo_facturado", label: "Facturado", color: "var(--color-primary)", isCurrency: true, adminOnly: true },
] as const;

function fmtNum(v: number, isCurrency: boolean) {
  if (!isCurrency) return String(v);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K €`;
  return `${v} €`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function MiniRing({ value, objetivo, color }: { value: number; objetivo: number; color: string }) {
  const pct = objetivo > 0 ? Math.min(value / objetivo, 1) : 0;
  const offset = CIRC * (1 - pct);
  return (
    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={RADIUS} fill="none" strokeWidth="4" style={{ stroke: "var(--color-border)" }} />
      <circle
        cx="22"
        cy="22"
        r={RADIUS}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        style={{ stroke: color, transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

export default function AgentPerformanceTable({ agents, role }: AgentPerformanceTableProps) {
  const canSeeFacturado = role === "Administrador" || role === "Director";
  const METRICS = ALL_METRICS.filter((m) => !m.adminOnly || canSeeFacturado);
  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-semibold text-text-primary">Rendimiento por agente</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Métricas anuales del equipo. Mismo dato que la página de Desarrollo.
        </p>
      </div>

      {agents.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          No hay agentes para mostrar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Agente
                </th>
                {METRICS.map((m) => (
                  <th
                    key={m.key}
                    className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-background"
                >
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(agent.nombre)}
                      </div>
                      <span className="font-medium text-text-primary">{agent.nombre}</span>
                    </div>
                  </td>
                  {METRICS.map((m) => {
                    const value = agent.rendimiento[m.key];
                    const objetivo = agent.rendimiento[m.obj];
                    const pct = objetivo > 0 ? Math.round((value / objetivo) * 100) : 0;
                    return (
                      <td key={m.key} className="py-3 pr-6">
                        <div className="flex items-center gap-3">
                          <MiniRing value={value} objetivo={objetivo} color={m.color} />
                          <div className="leading-tight">
                            <p className="text-sm font-semibold text-text-primary">
                              {fmtNum(value, m.isCurrency)}
                            </p>
                            <p className="text-xs text-text-secondary">{pct}% del objetivo</p>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
