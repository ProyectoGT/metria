"use client";

import { useMemo, useState } from "react";
import {
  Bath,
  BedDouble,
  Car,
  FileText,
  Filter,
  History,
  Inbox,
  MapPin,
  Phone,
  Plus,
  SearchX,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Drawer from "@/components/ui/drawer";
import DocumentGeneratorModal from "@/modules/documents/components/DocumentGeneratorModal";
import ColaboracionesPanel from "@/modules/colaboraciones/components/ColaboracionesPanel";
import { createClient } from "@/lib/supabase-browser";
import {
  ACCESS_SCOPE_BADGES,
  ACCESS_SCOPE_LABELS,
  normalizeAccessScope,
  type AccessScope,
} from "@/lib/access-scope";
import PropertyMatchesPanel from "@/modules/matching/components/PropertyMatchesPanel";
import ContactoTimeline, { type TimelineEvent } from "@/modules/contactos/components/ContactoTimeline";
import RelatedEmailsPanel from "@/modules/email/components/RelatedEmailsPanel";
import ModalidadSelector from "@/modules/solicitudes/components/ModalidadSelector";
import SolicitudNotesPanel from "@/modules/solicitudes/components/SolicitudNotesPanel";
import {
  formatModalidadPedido,
  getModalidadOption,
  MODALIDADES_PEDIDO,
} from "@/modules/solicitudes/services/modalidades";
import type { UserRole } from "@/lib/roles";
import { useToast, Toaster } from "@/components/ui/toast";
import {
  useResetSolicitudesFilters,
  useSetSolicitudesFilter,
  useSolicitudesFilters,
} from "@/hooks/use-filters";

// ─── Types ────────────────────────────────────────────────────────────────────

type Agente = { id: number; nombre: string; apellidos: string; rol: string | null };

type Pedido = {
  id: number;
  nombre_cliente: string;
  telefono: string | null;
  tipo_propiedad: string | null;
  zona_busqueda: string | null;
  presupuesto: number | null;
  modalidad: string | null;
  habitaciones: number | null;
  banos: number | null;
  altura_deseada: string | null;
  garaje: boolean | null;
  origen: string | null;
  referencia: string | null;
  notas: string | null;
  visibility: AccessScope | string | null;
  visibility_agente_ids: number[] | null;
  owner_user_id: number | null;
};

type PedidoForm = Omit<Pedido, "id" | "owner_user_id">;

type Props = {
  initialPedidos: Pedido[];
  agentes: Agente[];
  currentUserId: number | null;
  currentUserRole: UserRole | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_PROPIEDAD = ["Piso", "Casa", "Chalet", "Local", "Nave", "Garaje", "Terreno", "Otro"];

const ALCANCE_ORDEN: AccessScope[] = ["private", "company", "team", "agents", "responsable"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(): PedidoForm {
  return {
    nombre_cliente: "",
    telefono: null,
    tipo_propiedad: null,
    zona_busqueda: null,
    presupuesto: null,
    modalidad: null,
    habitaciones: null,
    banos: null,
    altura_deseada: null,
    garaje: null,
    origen: null,
    referencia: null,
    notas: null,
    visibility: "private",
    visibility_agente_ids: null,
  };
}

function canManagePedido(pedido: Pick<Pedido, "owner_user_id">, currentUserId: number | null, currentUserRole: UserRole | null) {
  if (!currentUserId || !currentUserRole) return false;
  if (currentUserRole === "Administrador" || currentUserRole === "Director" || currentUserRole === "Responsable") return true;
  return pedido.owner_user_id === currentUserId;
}

function formatPresupuesto(value: number | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function parseBudgetFilter(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBudgetRangeInvalid(minValue: string, maxValue: string) {
  const min = parseBudgetFilter(minValue);
  const max = parseBudgetFilter(maxValue);
  return min !== null && max !== null && min > max;
}

function modalidadBadge(modalidad: string | null) {
  if (!modalidad) return <span className="text-text-secondary">-</span>;
  const option = getModalidadOption(modalidad);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5 ${option?.badgeClassName ?? "bg-gray-100 text-gray-700"}`}
      title={option?.title}
    >
      {option?.label ?? modalidad}
    </span>
  );
}

function origenBadge(origen: string | null) {
  if (origen === "oficina") {
    return <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-700/10">Oficina</span>;
  }
  if (origen === "online") {
    return <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/10">Online</span>;
  }
  return <span className="text-text-secondary">-</span>;
}

function TabBtn({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`flex-1 border-l border-border py-2 text-sm font-semibold transition-colors first:border-l-0 ${
        active ? "bg-primary text-white" : "bg-surface text-text-secondary hover:bg-background"
      }`}>
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PedidosClient({ initialPedidos, agentes, currentUserId, currentUserRole }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PedidoForm>(emptyForm());
  const [timelinePedido, setTimelinePedido] = useState<Pedido | null>(null);
  const [docPedido, setDocPedido] = useState<Pedido | null>(null);
  const [colabPedido, setColabPedido] = useState<Pedido | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtros = useSolicitudesFilters();
  const setFiltro = useSetSolicitudesFilter();
  const resetFiltros = useResetSolicitudesFilters();

  const presupuestoMinValue = filtros.presupuestoMin ?? "";
  const presupuestoMaxValue = filtros.presupuestoMax ?? "";
  const presupuestoMin = parseBudgetFilter(presupuestoMinValue);
  const presupuestoMax = parseBudgetFilter(presupuestoMaxValue);
  const invalidBudgetRange = isBudgetRangeInvalid(presupuestoMinValue, presupuestoMaxValue);

  const filtered = useMemo(() => {
    if (invalidBudgetRange) return [];

    return pedidos.filter((p) => {
      if (filtros.tipo && !(p.tipo_propiedad ?? "").toLowerCase().includes(filtros.tipo.toLowerCase())) return false;
      if (filtros.modalidad && p.modalidad !== filtros.modalidad) return false;
      if (filtros.origen && p.origen !== filtros.origen) return false;
      if (presupuestoMin !== null && (p.presupuesto ?? -Infinity) < presupuestoMin) return false;
      if (presupuestoMax !== null && (p.presupuesto ?? Infinity) > presupuestoMax) return false;
      return true;
    });
  }, [pedidos, filtros.tipo, filtros.modalidad, filtros.origen, presupuestoMin, presupuestoMax, invalidBudgetRange]);

  const hasFilters = Boolean(
    filtros.tipo ||
    filtros.modalidad ||
    filtros.origen ||
    presupuestoMinValue ||
    presupuestoMaxValue
  );

  const supabase = useMemo(() => createClient(), []);
  const { toasts, toast } = useToast();

  // Tipo propiedad — multi-chip helpers
  function getTipos(): string[] {
    if (!form.tipo_propiedad) return [];
    return form.tipo_propiedad.split(",").map((t) => t.trim()).filter(Boolean);
  }
  function toggleTipo(tipo: string) {
    const current = getTipos();
    const next = current.includes(tipo) ? current.filter((t) => t !== tipo) : [...current, tipo];
    setForm((f) => ({ ...f, tipo_propiedad: next.length ? next.join(", ") : null }));
  }

  // Agent multi-select
  const selectedAgentIds: number[] = form.visibility_agente_ids ?? [];
  function toggleAgente(id: number) {
    const next = selectedAgentIds.includes(id) ? selectedAgentIds.filter((x) => x !== id) : [...selectedAgentIds, id];
    setForm((f) => ({ ...f, visibility_agente_ids: next.length ? next : null }));
  }

  const needsAgentSelect = form.visibility === "agents" || form.visibility === "responsable";
  const agentesParaAlcance = agentes.filter((a) =>
    form.visibility === "responsable" ? (a.rol === "Responsable" || a.rol === "Director") : true
  );

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(pedido: Pedido) {
    setEditId(pedido.id);
    setForm({
      nombre_cliente: pedido.nombre_cliente,
      telefono: pedido.telefono,
      tipo_propiedad: pedido.tipo_propiedad,
      zona_busqueda: pedido.zona_busqueda,
      presupuesto: pedido.presupuesto,
      modalidad: pedido.modalidad,
      habitaciones: pedido.habitaciones,
      banos: pedido.banos,
      altura_deseada: pedido.altura_deseada,
      garaje: pedido.garaje,
      origen: pedido.origen,
      referencia: pedido.referencia,
      notas: pedido.notas,
      visibility: normalizeAccessScope(pedido.visibility),
      visibility_agente_ids: pedido.visibility_agente_ids,
    });
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nombre_cliente.trim()) return;
    setSaving(true);
    setSaveError(null);

    const payload = {
      nombre_cliente: form.nombre_cliente.trim(),
      telefono: form.telefono || null,
      tipo_propiedad: form.tipo_propiedad || null,
      zona_busqueda: form.zona_busqueda?.trim() || null,
      presupuesto: form.presupuesto || null,
      modalidad: form.modalidad || null,
      habitaciones: form.habitaciones || null,
      banos: form.banos || null,
      altura_deseada: form.altura_deseada?.trim() || null,
      garaje: form.garaje,
      origen: form.origen || null,
      referencia: form.referencia?.trim() || null,
      notas: form.notas?.trim() || null,
      visibility: normalizeAccessScope(form.visibility),
      visibility_agente_ids: needsAgentSelect ? (form.visibility_agente_ids ?? null) : null,
    };

    if (editId !== null) {
      const { data, error } = await supabase.from("pedidos").update(payload).eq("id", editId).select().single();
      if (error) { setSaveError(error.message); setSaving(false); return; }
      if (data) { setPedidos((prev) => prev.map((p) => (p.id === editId ? (data as Pedido) : p))); toast("Solicitud actualizada"); setModalOpen(false); }
    } else {
      const { data, error } = await supabase.from("pedidos").insert(payload).select().single();
      if (error) { setSaveError(error.message); setSaving(false); return; }
      if (data) { setPedidos((prev) => [data as Pedido, ...prev]); toast("Solicitud creada"); setModalOpen(false); }
    }
    setSaving(false);
  }

  function pedidoTimelineEvents(pedido: Pedido): TimelineEvent[] {
    const details = [
      pedido.tipo_propiedad && `Tipo: ${pedido.tipo_propiedad}`,
      pedido.zona_busqueda && `Zona: ${pedido.zona_busqueda}`,
      pedido.presupuesto && `Presupuesto: ${formatPresupuesto(pedido.presupuesto)}`,
      pedido.modalidad && `Modalidad: ${formatModalidadPedido(pedido.modalidad)}`,
      pedido.telefono && `Telefono: ${pedido.telefono}`,
      pedido.origen && `Origen: ${pedido.origen}`,
    ].filter(Boolean);

    return [{
      id: `pedido-${pedido.id}`,
      pedido_id: pedido.id,
      agente_id: pedido.owner_user_id,
      tipo_evento: "pedido",
      titulo: "Solicitud registrada",
      descripcion: details.join("\n") || null,
      created_at: new Date().toISOString(),
      synthetic: true,
    }];
  }

  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    const { error } = await supabase.from("pedidos").delete().eq("id", deleteId);
    if (error) { toast(`Error al eliminar: ${error.message}`, "error"); }
    else { setPedidos((prev) => prev.filter((p) => p.id !== deleteId)); toast("Solicitud eliminada"); setDeleteId(null); }
    setDeleting(false);
  }

  function scopeBadge(scope: Pedido["visibility"]) {
    const normalized = normalizeAccessScope(scope);
    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5 ${ACCESS_SCOPE_BADGES[normalized]}`}>
        {ACCESS_SCOPE_LABELS[normalized]}
      </span>
    );
  }

  return (
    <>
      {/* Cabecera */}
      <div className="mb-5 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-text-primary">Pipeline de solicitudes</h2>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Encuentra clientes por perfil, presupuesto y modalidad sin perder contexto comercial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Visibles</p>
                <p className="mt-0.5 text-sm font-semibold text-text-primary">{filtered.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Total</p>
                <p className="mt-0.5 text-sm font-semibold text-text-primary">{pedidos.length}</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Nueva solicitud
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-5 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background text-text-secondary">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-text-primary">Filtros</p>
              <p className="text-xs text-text-secondary">Ajusta el listado sin perder la vista comercial.</p>
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={resetFiltros}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
            >
              <Filter className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Tipo</label>
            <input
              type="text"
              value={filtros.tipo ?? ""}
              onChange={(e) => setFiltro("tipo", e.target.value || null)}
              placeholder="Piso, Casa..."
              className="input h-9 py-0 text-sm transition-colors hover:border-border-strong"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Modalidad</label>
            <select
              value={filtros.modalidad ?? ""}
              onChange={(e) => setFiltro("modalidad", e.target.value || null)}
              className="input h-9 py-0 text-sm transition-colors hover:border-border-strong"
            >
              <option value="">Todas</option>
              {MODALIDADES_PEDIDO.map((m) => <option key={m.value} value={m.value}>{m.label} - {m.title}</option>)}
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Origen</label>
            <select
              value={filtros.origen ?? ""}
              onChange={(e) => setFiltro("origen", e.target.value || null)}
              className="input h-9 py-0 text-sm transition-colors hover:border-border-strong"
            >
              <option value="">Todos</option>
              <option value="oficina">Oficina</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Desde</label>
            <input
              type="text"
              inputMode="decimal"
              value={presupuestoMinValue}
              onChange={(e) => setFiltro("presupuestoMin", e.target.value)}
              placeholder="200.000 €"
              className={`input h-9 py-0 text-sm transition-colors hover:border-border-strong ${invalidBudgetRange ? "border-danger focus:border-danger" : ""}`}
              aria-invalid={invalidBudgetRange}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Hasta</label>
            <input
              type="text"
              inputMode="decimal"
              value={presupuestoMaxValue}
              onChange={(e) => setFiltro("presupuestoMax", e.target.value)}
              placeholder="350.000 €"
              className={`input h-9 py-0 text-sm transition-colors hover:border-border-strong ${invalidBudgetRange ? "border-danger focus:border-danger" : ""}`}
              aria-invalid={invalidBudgetRange}
            />
          </div>
        </div>
        {invalidBudgetRange && (
          <p className="mt-2 text-xs font-medium text-danger">El presupuesto minimo no puede ser mayor que el maximo.</p>
        )}
      </div>

      {/* Tabla */}
      {pedidos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-semibold text-text-primary">No hay solicitudes todavia</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">Crea la primera solicitud para empezar a organizar oportunidades comerciales.</p>
          <button onClick={openCreate} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
            <Plus className="h-4 w-4" />
            Nueva solicitud
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-background text-text-secondary">
            <SearchX className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-semibold text-text-primary">
            {invalidBudgetRange ? "El rango de presupuesto no es valido" : "No hay solicitudes con estos filtros"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">Ajusta los filtros o limpia la busqueda para recuperar el listado completo.</p>
          <button onClick={resetFiltros} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-background hover:text-primary">Limpiar filtros</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">Solicitudes activas</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
                {hasFilters && pedidos.length !== filtered.length && <span className="ml-1">de {pedidos.length}</span>}
              </p>
            </div>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
              Ordenado por creacion
            </span>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-background/95 backdrop-blur">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Cliente</th>
                <th className="w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Telefono</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Tipo</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Zona</th>
                <th className="w-24 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Modal.</th>
                <th className="w-32 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Presupuesto</th>
                <th className="w-12 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Hab.</th>
                <th className="w-12 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Ban.</th>
                <th className="w-18 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Garaje</th>
                <th className="w-22 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Origen</th>
                <th className="w-24 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Alcance</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((pedido) => (
                <tr key={pedido.id} onClick={() => openEdit(pedido)} className="group cursor-pointer transition-colors hover:bg-primary/5">
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-sm font-semibold text-primary ring-1 ring-border">
                        {pedido.nombre_cliente.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text-primary">{pedido.nombre_cliente}</p>
                        {pedido.altura_deseada && <p className="text-xs text-text-secondary">Altura: {pedido.altura_deseada}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text-secondary">
                    {pedido.telefono ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {pedido.telefono}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-text-secondary">{pedido.tipo_propiedad ?? "-"}</td>
                  <td className="max-w-[150px] truncate px-4 py-4 text-xs text-text-secondary" title={pedido.zona_busqueda ?? ""}>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{pedido.zona_busqueda ?? "-"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">{modalidadBadge(pedido.modalidad)}</td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-semibold text-text-primary">{formatPresupuesto(pedido.presupuesto)}</span>
                  </td>
                  <td className="px-4 py-4 text-center text-text-secondary">
                    <span className="inline-flex items-center justify-center gap-1"><BedDouble className="h-3.5 w-3.5" />{pedido.habitaciones ?? "-"}</span>
                  </td>
                  <td className="px-4 py-4 text-center text-text-secondary">
                    <span className="inline-flex items-center justify-center gap-1"><Bath className="h-3.5 w-3.5" />{pedido.banos ?? "-"}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {pedido.garaje === true ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><Car className="h-3.5 w-3.5" />Si</span>
                    : pedido.garaje === false ? <span className="text-xs text-text-secondary">No</span>
                    : <span className="text-text-secondary">-</span>}
                  </td>
                  <td className="px-4 py-4 text-center">{origenBadge(pedido.origen)}</td>
                  <td className="px-4 py-4 text-center">{scopeBadge(pedido.visibility)}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setTimelinePedido(pedido); }}
                        className="rounded-lg p-1.5 text-text-secondary opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                        title="Timeline"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      {canManagePedido(pedido, currentUserId, currentUserRole) && (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(pedido.id); }}
                          className="rounded-lg p-1.5 text-text-secondary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100" title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── Drawer formulario ── */}
      <Drawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId !== null ? (() => {
          const pedido = pedidos.find((p) => p.id === editId);
          return pedido?.nombre_cliente ?? "Editar solicitud";
        })() : "Nueva solicitud"}
        subtitle={editId !== null ? `Solicitud #${editId}` : undefined}
        width="lg"
        headerActions={editId !== null ? (() => {
          const pedido = pedidos.find((p) => p.id === editId);
          if (!pedido) return null;
          return (
            <>
              <button
                type="button"
                onClick={() => setColabPedido(pedido)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-primary"
                title="Colaboraciones"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDocPedido(pedido)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-primary"
                title="Generar documento"
              >
                <FileText className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTimelinePedido(pedido)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-primary"
                title="Timeline"
              >
                <History className="h-4 w-4" />
              </button>
              <div className="mx-1 h-4 w-px bg-border" />
            </>
          );
        })() : undefined}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre_cliente.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
              {saving ? "Guardando..." : editId !== null ? "Guardar cambios" : "Crear solicitud"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 px-5 py-5">
          {editId !== null && (() => {
            const pedido = pedidos.find((p) => p.id === editId);
            return pedido?.telefono ? (
              <p className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Phone className="h-3.5 w-3.5" />
                {pedido.telefono}
              </p>
            ) : null;
          })()}

          {/* Cliente + teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-text-secondary">Nombre del cliente *</label>
              <input type="text" value={form.nombre_cliente} onChange={(e) => setForm({ ...form, nombre_cliente: e.target.value })}
                placeholder="Nombre completo" className="input mt-1.5" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Telefono</label>
              <input type="tel" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value || null })}
                placeholder="600 000 000" className="input mt-1.5" />
            </div>
          </div>

          {/* Tipo de propiedad — chips multi-selección */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Tipo de propiedad</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIPOS_PROPIEDAD.map((tipo) => {
                const active = getTipos().includes(tipo);
                return (
                  <button key={tipo} type="button" onClick={() => toggleTipo(tipo)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active ? "border-primary bg-primary text-white" : "border-border text-text-secondary hover:border-primary hover:text-primary"
                    }`}>
                    {tipo}
                  </button>
                );
              })}
            </div>
            {getTipos().length > 0 && (
              <p className="mt-1.5 text-xs text-text-secondary">Seleccionado: {form.tipo_propiedad}</p>
            )}
          </div>

          {/* Modalidad */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Modalidad</label>
            <div className="mt-1.5">
              <ModalidadSelector
                value={form.modalidad}
                onChange={(modalidad) => setForm({ ...form, modalidad })}
              />
            </div>
          </div>

          {/* Zona búsqueda */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Zona de busqueda</label>
            <input type="text" value={form.zona_busqueda ?? ""}
              onChange={(e) => setForm({ ...form, zona_busqueda: e.target.value || null })}
              placeholder="Ej: Cornella, Hospitalet centro, Sant Feliu y Sant Joan Despi"
              className="input mt-1.5" />
          </div>

          {/* Presupuesto + Habitaciones + Baños */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Presupuesto (€)</label>
              <input type="number" value={form.presupuesto ?? ""}
                onChange={(e) => setForm({ ...form, presupuesto: e.target.value ? Number(e.target.value) : null })}
                placeholder="150000" min={0} className="input mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Habitaciones</label>
              <input type="number" value={form.habitaciones ?? ""}
                onChange={(e) => setForm({ ...form, habitaciones: e.target.value ? Number(e.target.value) : null })}
                placeholder="3" min={0} className="input mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Banos</label>
              <input type="number" value={form.banos ?? ""}
                onChange={(e) => setForm({ ...form, banos: e.target.value ? Number(e.target.value) : null })}
                placeholder="1" min={0} className="input mt-1.5" />
            </div>
          </div>

          {/* Altura + Garaje */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Altura deseada</label>
              <input type="text" value={form.altura_deseada ?? ""}
                onChange={(e) => setForm({ ...form, altura_deseada: e.target.value || null })}
                placeholder="Ej: 3 o superior, bajo no" className="input mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Garaje</label>
              <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
                <TabBtn active={form.garaje === true} onClick={() => setForm({ ...form, garaje: form.garaje === true ? null : true })}>Si</TabBtn>
                <TabBtn active={form.garaje === false} onClick={() => setForm({ ...form, garaje: form.garaje === false ? null : false })}>No</TabBtn>
              </div>
            </div>
          </div>

          {/* Origen */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Origen</label>
            <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
              <TabBtn active={form.origen === "oficina"} onClick={() => setForm({ ...form, origen: form.origen === "oficina" ? null : "oficina" })}>Oficina</TabBtn>
              <TabBtn active={form.origen === "online"} onClick={() => setForm({ ...form, origen: form.origen === "online" ? null : "online" })}>Online</TabBtn>
            </div>
          </div>

          {/* Alcance */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Alcance del contenido</label>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {ALCANCE_ORDEN.map((scope) => (
                <button key={scope} type="button"
                  onClick={() => setForm({ ...form, visibility: scope, visibility_agente_ids: null })}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                    normalizeAccessScope(form.visibility) === scope
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-text-secondary hover:text-text-primary"
                  }`}>
                  {ACCESS_SCOPE_LABELS[scope]}
                </button>
              ))}
            </div>

            {needsAgentSelect && agentesParaAlcance.length > 0 && (
              <div className="mt-2 rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-xs font-medium text-text-secondary">
                  {form.visibility === "responsable"
                    ? "Selecciona responsables (todos si no eliges ninguno)"
                    : "Selecciona agentes (todos si no eliges ninguno)"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {agentesParaAlcance.map((a) => {
                    const active = selectedAgentIds.includes(a.id);
                    return (
                      <button key={a.id} type="button" onClick={() => toggleAgente(a.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          active ? "border-primary bg-primary text-white" : "border-border text-text-secondary hover:border-primary hover:text-primary"
                        }`}>
                        {a.nombre} {a.apellidos}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-1.5 text-xs text-text-secondary">
              {form.visibility === "private" && "Solo visible para ti."}
              {form.visibility === "company" && "Visible para toda la empresa."}
              {form.visibility === "team" && "Visible para tu equipo."}
              {form.visibility === "agents" && "Visible para los agentes que selecciones."}
              {form.visibility === "responsable" && "Visible para los responsables que selecciones."}
            </p>
          </div>

          {/* Referencia */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Referencia de inmueble</label>
            <input type="text" value={form.referencia ?? ""}
              onChange={(e) => setForm({ ...form, referencia: e.target.value || null })}
              placeholder="Ref. o descripcion del inmueble" className="input mt-1.5" />
          </div>

          {editId !== null ? (() => {
            const pedido = pedidos.find((p) => p.id === editId);
            return pedido ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Contexto base</label>
                  <textarea value={form.notas ?? ""}
                    onChange={(e) => setForm({ ...form, notas: e.target.value || null })}
                    placeholder="Resumen estable del cliente, preferencias o condiciones clave..."
                    rows={4} className="input mt-1.5 resize-y leading-6" />
                </div>
                <SolicitudNotesPanel
                  pedidoId={pedido.id}
                  currentUserId={currentUserId}
                  legacyNotes={form.notas}
                />
              </div>
            ) : null;
          })() : (
            <div>
              <label className="text-xs font-medium text-text-secondary">Nota inicial</label>
              <textarea value={form.notas ?? ""}
                onChange={(e) => setForm({ ...form, notas: e.target.value || null })}
                placeholder="Contexto inicial del cliente, preferencias, urgencia o proximo paso..."
                rows={5} className="input mt-1.5 resize-y leading-6" />
              <p className="mt-1.5 text-xs text-text-secondary">
                Al crear la solicitud, el seguimiento completo estara disponible en el historial de notas.
              </p>
            </div>
          )}

          {editId !== null && (() => {
            const pedido = pedidos.find((p) => p.id === editId);
            return pedido ? (
              <PropertyMatchesPanel pedido={pedido} currentUserId={currentUserId} />
            ) : null;
          })()}

          {saveError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{saveError}</p>}
        </div>
      </Drawer>

      {/* Confirmar borrado */}
      <Drawer
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar solicitud"
        width="sm"
      >
        <div className="p-5">
          <p className="text-sm text-text-secondary">Esta accion no se puede deshacer.</p>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
            <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {deleting ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>
      </Drawer>

      {/* Timeline en Drawer */}
      <Drawer
        open={!!timelinePedido}
        onClose={() => setTimelinePedido(null)}
        title={timelinePedido?.nombre_cliente ?? ""}
        subtitle="Timeline de la solicitud"
        width="xl"
        zIndex="z-[50]"
      >
        {timelinePedido && (
          <>
            <ContactoTimeline
              subject={{ type: "pedido", id: timelinePedido.id, title: timelinePedido.nombre_cliente }}
              currentUserId={currentUserId}
              initialEvents={pedidoTimelineEvents(timelinePedido)}
            />
            <RelatedEmailsPanel
              entityType="pedido"
              entityId={timelinePedido.id}
              replyTo={null}
            />
          </>
        )}
      </Drawer>

      {colabPedido && (
        <ColaboracionesPanel
          entidad_tipo="pedido"
          entidad_id={colabPedido.id}
          entidad_label={colabPedido.nombre_cliente}
          currentUserId={currentUserId ?? 0}
          agentes={agentes}
          onClose={() => setColabPedido(null)}
        />
      )}

      {docPedido && (
        <DocumentGeneratorModal
          subject={{
            type: "pedido",
            id: docPedido.id,
            label: docPedido.nombre_cliente,
          }}
          onClose={() => setDocPedido(null)}
        />
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
