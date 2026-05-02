"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  ACCESS_SCOPE_BADGES,
  ACCESS_SCOPE_LABELS,
  normalizeAccessScope,
  type AccessScope,
} from "@/lib/access-scope";
import type { UserRole } from "@/lib/roles";
import { useToast, Toaster } from "@/components/ui/toast";

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

type Modalidad = "CV" | "CH" | "ALQ";
const MODALIDADES: { value: Modalidad; label: string; title: string }[] = [
  { value: "CV", label: "C/V", title: "Compra y vende" },
  { value: "CH", label: "C/H", title: "Compra con hipoteca" },
  { value: "ALQ", label: "ALQ", title: "Alquiler" },
];

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

function modalidadBadge(modalidad: string | null) {
  if (!modalidad) return <span className="text-text-secondary">-</span>;
  const m = MODALIDADES.find((x) => x.value === modalidad);
  const colors: Record<string, string> = {
    CV: "bg-green-100 text-green-700",
    CH: "bg-blue-100 text-blue-700",
    ALQ: "bg-violet-100 text-violet-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[modalidad] ?? "bg-gray-100 text-gray-700"}`} title={m?.title}>
      {m?.label ?? modalidad}
    </span>
  );
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filterTipo, setFilterTipo] = useState("");
  const [filterModalidad, setFilterModalidad] = useState("");
  const [filterOrigen, setFilterOrigen] = useState("");

  const filtered = useMemo(() => {
    return pedidos.filter((p) => {
      if (filterTipo && !(p.tipo_propiedad ?? "").toLowerCase().includes(filterTipo.toLowerCase())) return false;
      if (filterModalidad && p.modalidad !== filterModalidad) return false;
      if (filterOrigen && p.origen !== filterOrigen) return false;
      return true;
    });
  }, [pedidos, filterTipo, filterModalidad, filterOrigen]);

  const hasFilters = filterTipo || filterModalidad || filterOrigen;

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
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ACCESS_SCOPE_BADGES[normalized]}`}>
        {ACCESS_SCOPE_LABELS[normalized]}
      </span>
    );
  }

  return (
    <>
      {/* Barra superior */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {filtered.length} {filtered.length === 1 ? "solicitud" : "solicitudes"}
          {hasFilters && pedidos.length !== filtered.length && <span className="ml-1">de {pedidos.length}</span>}
        </p>
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark">
          + Nueva solicitud
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[130px] flex-1 flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Tipo</label>
            <input type="text" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} placeholder="Piso, Casa..." className="input h-8 py-0 text-sm" />
          </div>
          <div className="flex min-w-[140px] flex-1 flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Modalidad</label>
            <select value={filterModalidad} onChange={(e) => setFilterModalidad(e.target.value)} className="input h-8 py-0 text-sm">
              <option value="">Todas</option>
              {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label} — {m.title}</option>)}
            </select>
          </div>
          <div className="flex min-w-[130px] flex-1 flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Origen</label>
            <select value={filterOrigen} onChange={(e) => setFilterOrigen(e.target.value)} className="input h-8 py-0 text-sm">
              <option value="">Todos</option>
              <option value="oficina">Oficina</option>
              <option value="online">Online</option>
            </select>
          </div>
          {hasFilters && (
            <button onClick={() => { setFilterTipo(""); setFilterModalidad(""); setFilterOrigen(""); }}
              className="mb-0.5 shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-danger/40 hover:text-danger">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {pedidos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">No hay solicitudes todavia</p>
          <button onClick={openCreate} className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ Nueva solicitud</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">No hay solicitudes con estos filtros</p>
          <button onClick={() => { setFilterTipo(""); setFilterModalidad(""); setFilterOrigen(""); }} className="mt-3 text-sm text-primary hover:underline">Limpiar filtros</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-5 py-3 text-left font-medium text-text-secondary">Cliente</th>
                <th className="w-32 px-4 py-3 text-left font-medium text-text-secondary">Telefono</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Zona</th>
                <th className="w-20 px-4 py-3 text-center font-medium text-text-secondary">Modal.</th>
                <th className="w-28 px-4 py-3 text-right font-medium text-text-secondary">Presupuesto</th>
                <th className="w-12 px-4 py-3 text-center font-medium text-text-secondary">Hab.</th>
                <th className="w-12 px-4 py-3 text-center font-medium text-text-secondary">Ban.</th>
                <th className="w-18 px-4 py-3 text-center font-medium text-text-secondary">Garaje</th>
                <th className="w-22 px-4 py-3 text-center font-medium text-text-secondary">Origen</th>
                <th className="w-24 px-4 py-3 text-center font-medium text-text-secondary">Alcance</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((pedido) => (
                <tr key={pedido.id} onClick={() => openEdit(pedido)} className="group cursor-pointer transition-colors hover:bg-background">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-text-primary">{pedido.nombre_cliente}</p>
                    {pedido.altura_deseada && <p className="text-xs text-text-secondary">Altura: {pedido.altura_deseada}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">{pedido.telefono ?? "-"}</td>
                  <td className="px-4 py-3.5 text-xs text-text-secondary">{pedido.tipo_propiedad ?? "-"}</td>
                  <td className="max-w-[130px] truncate px-4 py-3.5 text-xs text-text-secondary" title={pedido.zona_busqueda ?? ""}>{pedido.zona_busqueda ?? "-"}</td>
                  <td className="px-4 py-3.5 text-center">{modalidadBadge(pedido.modalidad)}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-text-primary">{formatPresupuesto(pedido.presupuesto)}</td>
                  <td className="px-4 py-3.5 text-center text-text-secondary">{pedido.habitaciones ?? "-"}</td>
                  <td className="px-4 py-3.5 text-center text-text-secondary">{pedido.banos ?? "-"}</td>
                  <td className="px-4 py-3.5 text-center">
                    {pedido.garaje === true ? <span className="text-xs font-medium text-green-600">Si</span>
                    : pedido.garaje === false ? <span className="text-xs text-text-secondary">No</span>
                    : <span className="text-text-secondary">-</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {pedido.origen === "oficina" ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Oficina</span>
                    : pedido.origen === "online" ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">Online</span>
                    : <span className="text-text-secondary">-</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">{scopeBadge(pedido.visibility)}</td>
                  <td className="px-4 py-3.5 text-right">
                    {canManagePedido(pedido, currentUserId, currentUserRole) && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(pedido.id); }}
                        className="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal formulario ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-surface shadow-xl" style={{ maxHeight: "calc(100vh - 2rem)" }}>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editId !== null ? "Editar solicitud" : "Nueva solicitud"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-xl text-text-secondary hover:text-text-primary">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

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

              {/* Modalidad — 3 pestañas */}
              <div>
                <label className="text-xs font-medium text-text-secondary">Modalidad</label>
                <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
                  {MODALIDADES.map((m) => (
                    <TabBtn key={m.value} active={form.modalidad === m.value}
                      onClick={() => setForm({ ...form, modalidad: form.modalidad === m.value ? null : m.value })}
                      title={m.title}>
                      {m.label}
                    </TabBtn>
                  ))}
                </div>
                {form.modalidad && (
                  <p className="mt-1 text-xs text-text-secondary">{MODALIDADES.find((m) => m.value === form.modalidad)?.title}</p>
                )}
              </div>

              {/* Zona búsqueda — texto libre */}
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

              {/* Notas — ampliada con resize */}
              <div>
                <label className="text-xs font-medium text-text-secondary">Notas</label>
                <textarea value={form.notas ?? ""}
                  onChange={(e) => setForm({ ...form, notas: e.target.value || null })}
                  placeholder="Observaciones del cliente, preferencias detalladas, condiciones especiales..."
                  rows={6} className="input mt-1.5 resize-y" />
              </div>

              {saveError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{saveError}</p>}
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.nombre_cliente.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {saving ? "Guardando..." : editId !== null ? "Guardar cambios" : "Crear solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar borrado */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-text-primary">Eliminar solicitud</h2>
            <p className="mt-2 text-sm text-text-secondary">Esta accion no se puede deshacer.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
