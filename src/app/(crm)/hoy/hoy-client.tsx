"use client";

import { memo, useCallback, useState, useMemo } from "react";
import {
  AlertTriangle, Sun, CalendarDays, RefreshCw, ClipboardList, Bell, Activity,
  ChevronDown, Clock, Users, CheckCircle2, ArrowRight, Inbox,
} from "lucide-react";
import { AnimatedAccordion, AnimatedList, AnimatedListItem } from "@/components/ui/animated";
import PageHeader from "@/components/layout/page-header";
import type { HoyData, HoyItem, HoySection, HoyPriority } from "@/modules/hoy/services/types";

const SECTION_ICONS: Record<string, React.ElementType> = {
  vencido: AlertTriangle,
  hoy: Sun,
  proximos: CalendarDays,
  seguimientos: RefreshCw,
  pedidos: ClipboardList,
  alertas: Bell,
  actividad: Activity,
};

const PRIORITY_CONFIG: Record<HoyPriority, { dot: string; label: string }> = {
  alta: { dot: "bg-danger", label: "Alta" },
  media: { dot: "bg-accent", label: "Media" },
  baja: { dot: "bg-success", label: "Baja" },
};

const KIND_LABEL: Record<string, string> = {
  tarea_vencida: "Tarea vencida",
  tarea_hoy: "Tarea",
  agenda_hoy: "Actividad",
  proxima_accion: "Proxima accion",
  propiedad_sin_seguimiento: "Sin seguimiento",
  pedido_sin_movimiento: "Pedido activo",
  alerta_ticket: "Ticket",
  alerta_recordatorio: "Recordatorio",
  actividad_reciente: "Actividad",
};

type OpenSections = Record<string, boolean>;

const PriorityDot = memo(function PriorityDot({ priority }: { priority: HoyPriority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.media;
  return <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} title={cfg.label} />;
})
const ItemKindBadge = memo(function ItemKindBadge({ kind }: { kind: string }) {
  const label = KIND_LABEL[kind] ?? kind;
  return (
    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
      {label}
    </span>
  );
})
const HoyItemRow = memo(function HoyItemRow({ item }: { item: HoyItem }) {
  return (
    <div className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-background/50">
      <PriorityDot priority={item.priority} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text-primary">
            {item.title}
          </span>
          {item.isCompleted && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs text-text-secondary line-clamp-1">
            {item.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ItemKindBadge kind={item.kind} />
          {item.dueDate && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary">
              <Clock className="h-3 w-3" />
              {item.dueDate}
              {item.time && <> {item.time}</>}
            </span>
          )}
          {item.assignedUserName && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary">
              <Users className="h-3 w-3" />
              {item.assignedUserName}
            </span>
          )}
        </div>
      </div>
      {item.entityHref && (
        <a
          href={item.entityHref}
          className="mt-1 shrink-0 rounded-lg p-1 text-text-secondary opacity-0 transition-opacity hover:bg-muted hover:text-text-primary group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
          aria-label="Ir al detalle"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
})
const HoySectionCard = memo(function HoySectionCard({
  section,
  isOpen,
  onToggle,
}: {
  section: HoySection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = SECTION_ICONS[section.id] ?? Inbox;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <Icon className="h-4 w-4 text-text-secondary" />
        <span className="flex-1 text-sm font-medium text-text-primary">
          {section.title}
        </span>
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
          {section.count}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatedAccordion isOpen={isOpen}>
        <div className="divide-y divide-border border-t border-border">
          <AnimatedList fast>
            {section.items.map((item) => (
              <AnimatedListItem key={item.id}>
                <HoyItemRow item={item} />
              </AnimatedListItem>
            ))}
          </AnimatedList>
        </div>
      </AnimatedAccordion>
    </div>
  );
});

const SummaryCard = memo(function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary">{label}</p>
          <p className="text-lg font-semibold text-text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
});

// Wrapper that creates a stable `onToggle` per section id,
// so HoySectionCard's memo isn't defeated by inline arrow functions.
const StableSectionCard = memo(function StableSectionCard({
  section, isOpen, onToggle,
}: { section: HoySection; isOpen: boolean; onToggle: (id: string) => void }) {
  const handleToggle = useCallback(() => onToggle(section.id), [section.id, onToggle]);
  return <HoySectionCard section={section} isOpen={isOpen} onToggle={handleToggle} />;
});

export default function HoyPanelClient({ hoyData }: { hoyData: HoyData | null }) {
  const [openSections, setOpenSections] = useState<OpenSections>(() => {
    const init: OpenSections = {};
    if (hoyData) {
      hoyData.sections.forEach((s) => {
        init[s.id] = s.id === "vencido" || s.id === "hoy";
      });
    }
    return init;
  });

  const stats = useMemo(() => {
    const s = hoyData?.sections ?? [];
    const vencido = s.find((x) => x.id === "vencido")?.items.length ?? 0;
    const hoyCount = s.find((x) => x.id === "hoy")?.items.length ?? 0;
    const proximos = s.find((x) => x.id === "proximos")?.items.length ?? 0;
    const seguimientos = s.find((x) => x.id === "seguimientos")?.items.length ?? 0;
    const pedidos = s.find((x) => x.id === "pedidos")?.items.length ?? 0;
    const alertas = s.find((x) => x.id === "alertas")?.items.length ?? 0;
    return { vencido, hoyCount, proximos, seguimientos, pedidos, alertas };
  }, [hoyData]);

  const sections = hoyData?.sections ?? [];

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  if (!hoyData) {
    return (
      <>
        <PageHeader title="Hoy" description="No se pudo cargar el panel." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Buenos dias, ${hoyData.currentUserName.split(" ")[0]}`}
        description={hoyData.dateLabel}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard icon={AlertTriangle} label="Vencido" value={stats.vencido} color="bg-danger" />
        <SummaryCard icon={Sun} label="Hoy" value={stats.hoyCount} color="bg-primary" />
        <SummaryCard icon={CalendarDays} label="Proximos" value={stats.proximos} color="bg-primary-light" />
        <SummaryCard icon={RefreshCw} label="Seguimientos" value={stats.seguimientos} color="bg-accent" />
        <SummaryCard icon={ClipboardList} label="Pedidos" value={stats.pedidos} color="bg-primary" />
        <SummaryCard icon={Bell} label="Alertas" value={stats.alertas} color="bg-danger" />
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <StableSectionCard
            key={section.id}
            section={section}
            isOpen={openSections[section.id] ?? false}
            onToggle={toggleSection}
          />
        ))}

        {sections.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-16">
            <CheckCircle2 className="mb-3 h-10 w-10 text-success" />
            <p className="text-sm font-medium text-text-primary">Todo al dia</p>
            <p className="mt-1 text-xs text-text-secondary">
              No hay tareas pendientes, actividades ni alertas.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
