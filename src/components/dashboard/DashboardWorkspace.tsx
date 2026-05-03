"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookUser,
  BriefcaseBusiness,
  ClipboardList,
  Eye,
  GitBranch,
  Kanban,
  Lightbulb,
  Search,
  TrendingUp,
  TriangleAlert,
  Newspaper,
} from "lucide-react";
import type { UserRole } from "@/lib/roles";
import type { NextBestAction } from "@/lib/next-actions";
import type { PipelineSuggestion } from "@/lib/pipeline-suggestions";
import type { LostOpportunity } from "@/lib/opportunities";
import type {
  SummaryType,
  PropertyListing,
  KanbanData,
  AgentMetrics,
  Rendimiento,
  OrdenDiaAgente,
} from "@/lib/mock/dashboard";
import Drawer from "@/components/ui/drawer";
import { Card, SectionCard } from "@/components/ui/card";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import NextBestActionsPanel from "@/components/dashboard/NextBestActionsPanel";
import PipelineSuggestionsPanel from "@/components/dashboard/PipelineSuggestionsPanel";
import LostOpportunitiesPanel from "@/components/dashboard/LostOpportunitiesPanel";
import MapaDashboardLazy from "@/components/dashboard/MapaDashboardLazy";
import OrdenDiaPanel from "@/components/dashboard/OrdenDiaPanel";
import AgentPerformanceTable from "@/components/dashboard/AgentPerformanceTable";
import MyActivity from "@/components/dashboard/MyActivity";
import AgentOfMonth from "@/components/dashboard/AgentOfMonth";
import type { NoticiaMapPoint } from "@/components/dashboard/MapaDashboard";

type MetricKey = SummaryType | "contactos";

type MetricCard = {
  key: MetricKey;
  title: string;
  value: number;
  subtitle: string;
  href?: string;
  icon: React.ElementType;
  accent: string;
  detailTitle?: string;
};

type Props = {
  role: UserRole;
  userName: string;
  currentUserId: number;
  summary: {
    noticias: number;
    investigaciones: number;
    encargos: number;
    pedidosActivos: number;
    contactos: number;
  };
  listings: Record<SummaryType, PropertyListing[]>;
  nextBestActions: NextBestAction[];
  pipelineSuggestions: PipelineSuggestion[];
  lostOpportunities: LostOpportunity[];
  kanbanData: KanbanData;
  kanbanCols: Array<{ id: string; title: string }>;
  agentMetrics: AgentMetrics[];
  ownMetrics: Rendimiento;
  ordenDiaAgentes: OrdenDiaAgente[];
  showOrdenDia: boolean;
  showAgentPerformance: boolean;
  showMyActivity: boolean;
  noticiasMap: NoticiaMapPoint[];
  encargosMap: NoticiaMapPoint[];
  empresaId: number | null;
  fullName: string;
  agenteMesData: {
    id: number;
    mes: string;
    premio: string;
    agente_nombre: string | null;
    agente_id: number | null;
    anadido_por: string;
  } | null;
};

const METRIC_ACCENT: Record<MetricKey, string> = {
  noticias: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  investigaciones: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  encargos: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  pedidosActivos: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  contactos: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
};

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M EUR`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K EUR`;
  return `${value} EUR`;
}

function buildMetricCards(summary: Props["summary"]): MetricCard[] {
  return [
    {
      key: "noticias",
      title: "Noticias",
      value: summary.noticias,
      subtitle: summary.noticias === 0 ? "Sin nuevas captaciones ahora mismo." : "Propiedades listas para atención inmediata.",
      href: "/zona",
      icon: Newspaper,
      accent: METRIC_ACCENT.noticias,
      detailTitle: "Detalle de noticias",
    },
    {
      key: "investigaciones",
      title: "Investigaciones",
      value: summary.investigaciones,
      subtitle: summary.investigaciones === 0 ? "No hay inmuebles en investigación." : "Seguimiento activo pendiente de avance.",
      href: "/zona",
      icon: Search,
      accent: METRIC_ACCENT.investigaciones,
      detailTitle: "Detalle de investigaciones",
    },
    {
      key: "encargos",
      title: "Encargos",
      value: summary.encargos,
      subtitle: summary.encargos === 0 ? "Sin encargos firmados visibles." : "Cartera en comercialización o cierre.",
      href: "/zona",
      icon: ClipboardList,
      accent: METRIC_ACCENT.encargos,
      detailTitle: "Detalle de encargos",
    },
    {
      key: "pedidosActivos",
      title: "Pedidos activos",
      value: summary.pedidosActivos,
      subtitle: summary.pedidosActivos === 0 ? "No hay solicitudes activas." : "Clientes compradores en seguimiento.",
      href: "/solicitudes",
      icon: BriefcaseBusiness,
      accent: METRIC_ACCENT.pedidosActivos,
      detailTitle: "Detalle de pedidos activos",
    },
    {
      key: "contactos",
      title: "Contactos",
      value: summary.contactos,
      subtitle: summary.contactos === 0 ? "Sin contactos visibles." : "Base activa para activar negocio y seguimiento.",
      href: "/contactos",
      icon: BookUser,
      accent: METRIC_ACCENT.contactos,
    },
  ];
}

function ListingTable({ rows }: { rows: PropertyListing[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
        <p className="text-sm text-text-secondary">No hay registros visibles para esta métrica.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-surface-raised/55">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Nombre</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Sector</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Finca / Tipo</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Estado</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-text-secondary">Agente</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-surface-raised/55">
              <td className="px-5 py-3.5 font-medium text-text-primary">{row.nombre}</td>
              <td className="px-5 py-3.5 text-text-secondary">{row.sector}</td>
              <td className="px-5 py-3.5 text-text-secondary">{row.finca}</td>
              <td className="px-5 py-3.5 text-text-secondary">{row.estado}</td>
              <td className="px-5 py-3.5 text-text-secondary">{row.agente}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type IntelligenceKey = "next" | "pipeline" | "lost";

function IntelligenceCard({
  title,
  description,
  count,
  accent,
  icon: Icon,
  onOpen,
}: {
  title: string;
  description: string;
  count: number;
  accent: string;
  icon: React.ElementType;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-all duration-200 hover:border-secondary/35 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary">
              {count}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-secondary" />
      </div>
    </button>
  );
}

function DashboardMetricCard({
  card,
  onOpen,
}: {
  card: MetricCard;
  onOpen?: () => void;
}) {
  const content = (
    <Card className="h-full border-border hover:border-secondary/35 hover:shadow-md" padding="md">
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-secondary">{card.title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">{card.value}</p>
          </div>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.accent}`}>
            <card.icon className="h-5 w-5" />
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="max-w-[18rem] text-sm text-text-secondary">{card.subtitle}</p>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
            Ver
            <Eye className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Card>
  );

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className="h-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link href={card.href ?? "/dashboard"} className="block h-full">
      {content}
    </Link>
  );
}

export default function DashboardWorkspace(props: Props) {
  const {
    role,
    userName,
    currentUserId,
    summary,
    listings,
    nextBestActions,
    pipelineSuggestions,
    lostOpportunities,
    kanbanData,
    kanbanCols,
    agentMetrics,
    ownMetrics,
    ordenDiaAgentes,
    showOrdenDia,
    showAgentPerformance,
    showMyActivity,
    noticiasMap,
    encargosMap,
    empresaId,
    fullName,
    agenteMesData,
  } = props;

  const metricCards = useMemo(() => buildMetricCards(summary), [summary]);
  const [openMetric, setOpenMetric] = useState<MetricKey | null>(null);
  const [openInsight, setOpenInsight] = useState<IntelligenceKey | null>(null);
  const [openDevelopment, setOpenDevelopment] = useState(false);

  const developmentSummary = useMemo(() => {
    const source = showAgentPerformance ? agentMetrics.map((agent) => agent.rendimiento) : [ownMetrics];
    return source.reduce(
      (acc, item) => ({
        facturado: acc.facturado + item.facturado,
        encargos: acc.encargos + item.encargos,
        ventas: acc.ventas + item.ventas,
        contactos: acc.contactos + item.contactos,
      }),
      { facturado: 0, encargos: 0, ventas: 0, contactos: 0 }
    );
  }, [agentMetrics, ownMetrics, showAgentPerformance]);

  const openMetricCard = metricCards.find((card) => card.key === openMetric) ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="flex min-w-0 flex-col gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">{`Panel comercial de ${userName}`}</h1>
          <p className="mt-1 text-sm text-text-secondary">Resumen operativo del día, seguimiento comercial y actividad del equipo.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => (
          <DashboardMetricCard
            key={card.key}
            card={card}
            onOpen={card.key === "contactos" ? undefined : () => setOpenMetric(card.key)}
          />
        ))}
      </section>

      <SectionCard
        title="Kanban"
        description="Organiza tus tareas y actividades sin cambiar el flujo actual."
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary">
            <Kanban className="h-3.5 w-3.5" />
            Operativo
          </span>
        }
      >
        <KanbanBoard
          initialData={kanbanData}
          customColumns={kanbanCols}
          role={role}
          currentUserId={String(currentUserId)}
          agents={agentMetrics.map((agent) => ({ id: agent.id, nombre: agent.nombre }))}
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Inteligencia comercial"
          description="Alertas y recomendaciones listas para revisar con más detalle."
          padding="md"
        >
          <div className="space-y-3">
            <IntelligenceCard
              title="Siguiente mejor acción"
              description="Acciones priorizadas para mover negocio real hoy."
              count={nextBestActions.length}
              icon={Lightbulb}
              accent="bg-primary/12 text-primary"
              onOpen={() => setOpenInsight("next")}
            />
            <IntelligenceCard
              title="Estado inteligente del pipeline"
              description="Sugerencias de cambio de estado basadas en actividad real."
              count={pipelineSuggestions.length}
              icon={GitBranch}
              accent="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              onOpen={() => setOpenInsight("pipeline")}
            />
            <IntelligenceCard
              title="Oportunidades a recuperar"
              description="Pedidos, clientes y propiedades con potencial sin seguimiento."
              count={lostOpportunities.length}
              icon={TriangleAlert}
              accent="bg-amber-500/12 text-amber-700 dark:text-amber-300"
              onOpen={() => setOpenInsight("lost")}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Mapa"
          description="Noticias y encargos con contexto geográfico."
          padding="none"
        >
          <MapaDashboardLazy noticias={noticiasMap} encargos={encargosMap} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Orden del día"
          description="Actividad operativa y próximas acciones del día."
          padding="none"
        >
          {showOrdenDia ? (
            <OrdenDiaPanel agentes={ordenDiaAgentes} />
          ) : (
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
              <Card padding="sm" className="border-border bg-surface-raised/45">
                <p className="text-xs font-medium text-text-secondary">Pendientes</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {kanbanData.columns.reduce((total, column) => total + column.cards.filter((card) => !card.isCompleted).length, 0)}
                </p>
              </Card>
              <Card padding="sm" className="border-border bg-surface-raised/45">
                <p className="text-xs font-medium text-text-secondary">Completadas</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {kanbanData.columns.reduce((total, column) => total + column.cards.filter((card) => card.isCompleted).length, 0)}
                </p>
              </Card>
              <Card padding="sm" className="border-border bg-surface-raised/45">
                <p className="text-xs font-medium text-text-secondary">Agenda hoy</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {kanbanData.columns.find((column) => column.id === "en_progreso")?.cards.length ?? 0}
                </p>
              </Card>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Desarrollo"
          description="Estado resumido del rendimiento comercial y acceso al detalle."
          action={
            <button
              type="button"
              onClick={() => setOpenDevelopment(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Ver detalle
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card padding="sm" className="border-border bg-surface-raised/45">
              <p className="text-xs font-medium text-text-secondary">Facturado</p>
              <p className="mt-2 text-xl font-semibold text-text-primary">{formatCompactCurrency(developmentSummary.facturado)}</p>
            </Card>
            <Card padding="sm" className="border-border bg-surface-raised/45">
              <p className="text-xs font-medium text-text-secondary">Encargos</p>
              <p className="mt-2 text-xl font-semibold text-text-primary">{developmentSummary.encargos}</p>
            </Card>
            <Card padding="sm" className="border-border bg-surface-raised/45">
              <p className="text-xs font-medium text-text-secondary">Ventas</p>
              <p className="mt-2 text-xl font-semibold text-text-primary">{developmentSummary.ventas}</p>
            </Card>
            <Card padding="sm" className="border-border bg-surface-raised/45">
              <p className="text-xs font-medium text-text-secondary">Contactos</p>
              <p className="mt-2 text-xl font-semibold text-text-primary">{developmentSummary.contactos}</p>
            </Card>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface-raised/35 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">{showAgentPerformance ? "Visión del equipo" : "Tu rendimiento anual"}</p>
              <p className="mt-0.5 text-sm text-text-secondary">Abre el detalle para revisar métricas, avance y objetivos.</p>
            </div>
            <Link href="/desarrollo" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ir a desarrollo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Agente del día"
        description="Bloque destacado final para reconocimiento y visibilidad comercial."
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            <TrendingUp className="h-3.5 w-3.5" />
            Destacado
          </span>
        }
      >
        <AgentOfMonth
          initialData={
            agenteMesData
              ? {
                  id: agenteMesData.id,
                  mes: agenteMesData.mes,
                  premio: agenteMesData.premio,
                  agente: agenteMesData.agente_nombre ?? null,
                  agenteId: agenteMesData.agente_id ?? null,
                  añadidoPor: agenteMesData.anadido_por,
                }
              : null
          }
          empresaId={empresaId}
          role={role}
          currentUserName={fullName}
          agents={agentMetrics.map((agent) => ({ id: agent.id, nombre: agent.nombre }))}
        />
      </SectionCard>

      <Drawer
        open={openMetric !== null}
        onClose={() => setOpenMetric(null)}
        title={openMetricCard?.detailTitle ?? "Detalle"}
        subtitle={openMetricCard?.subtitle}
        width="xl"
      >
        {openMetric && openMetric !== "contactos" && (
          <ListingTable rows={listings[openMetric as SummaryType]} />
        )}
      </Drawer>

      <Drawer
        open={openInsight !== null}
        onClose={() => setOpenInsight(null)}
        title={
          openInsight === "next"
            ? "Siguiente mejor acción"
            : openInsight === "pipeline"
              ? "Estado inteligente del pipeline"
              : "Oportunidades a recuperar"
        }
        subtitle="Detalle operativo del módulo seleccionado."
        width="xl"
      >
        <div className="p-5">
          {openInsight === "next" && (
            <NextBestActionsPanel actions={nextBestActions} currentUserId={currentUserId} defaultCollapsed={false} collapsible={false} />
          )}
          {openInsight === "pipeline" && (
            <PipelineSuggestionsPanel suggestions={pipelineSuggestions} defaultCollapsed={false} collapsible={false} />
          )}
          {openInsight === "lost" && (
            <LostOpportunitiesPanel opportunities={lostOpportunities} defaultCollapsed={false} collapsible={false} />
          )}
        </div>
      </Drawer>

      <Drawer
        open={openDevelopment}
        onClose={() => setOpenDevelopment(false)}
        title="Desarrollo"
        subtitle="Métricas y detalle del módulo sin alterar su funcionamiento."
        width="xl"
      >
        <div className="p-5">
          {showAgentPerformance ? (
            <AgentPerformanceTable agents={agentMetrics} role={role} />
          ) : showMyActivity ? (
            <MyActivity rendimiento={ownMetrics} role={role} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-text-secondary">No hay detalle de desarrollo disponible para este rol.</p>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
