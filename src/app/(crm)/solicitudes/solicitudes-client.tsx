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

type Zona = { id: number; nombre: string };

type Pedido = {
  id: number;
  nombre_cliente: string;
  telefono: string | null;
  tipo_propiedad: string | null;
  zona_deseada: number | null;
  presupuesto: number | null;
  compra_alquiler: boolean | null;
  habitaciones: number | null;
  garaje: boolean | null;
  origen: string | null;
  referencia: string | null;
  notas: string | null;
  visibility: AccessScope | string | null;
  owner_user_id: number | null;
};

type PedidoForm = Omit<Pedido, "id" | "owner_user_id">;

type Props = {
  initialPedidos: Pedido[];
  zonas: Zona[];
  currentUserId: number | null;
  currentUserRole: UserRole | null;
};

const TIPOS_PROPIEDAD = [
  "Piso",
  "Casa",
  "Chalet",
  "Local",
  "Nave",
  "Garaje",
  "Terreno",
  "Otro",
];

function emptyForm(): PedidoForm {
  return {
    nombre_cliente: "",
    telefono: null,
    tipo_propiedad: null,
    zona_deseada: null,
    presupuesto: null,
    compra_alquiler: null,
    habitaciones: null,
    garaje: null,
    origen: null,
    referencia: null,
    notas: null,
    visibility: "private",
  };
}

function canManagePedido(
  pedido: Pick<Pedido, "owner_user_id">,
  currentUserId: number | null,
  currentUserRole: UserRole | null
) {
  if (!currentUserId || !currentUserRole) {
    return false;
  }

  if (
    currentUserRole === "Administrador" ||
    currentUserRole === "Director" ||
    currentUserRole === "Responsable"
  ) {
    return true;
  }

  return pedido.owner_user_id === currentUserId;
}

export default function PedidosClient({
  initialPedidos,
  zonas,
  currentUserId,
  currentUserRole,
}: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PedidoForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterModalidad, setFilterModalidad] = useState<string>("");
  const [filterOrigen, setFilterOrigen] = useState<string>("");
  const [filterZona, setFilterZona] = useState<string>("");

  const filtered = useMemo(() => {
    return pedidos.filter((p) => {
      if (filterTipo && p.tipo_propiedad !== filterTipo) return false;
      if (filterModalidad === "compra" && p.compra_alquiler !== true) return false;
      if (filterModalidad === "alquiler" && p.compra_alquiler !== false) return false;
      if (filterOrigen && p.origen !== filterOrigen) return false;
      if (filterZona && String(p.zona_deseada) !== filterZona) return false;
      return true;
    });
  }, [pedidos, filterTipo, filterModalidad, filterOrigen, filterZona]);

  const hasFilters = filterTipo || filterModalidad || filterOrigen || filterZona;

  function clearFilters() {
    setFilterTipo("");
    setFilterModalidad("");
    setFilterOrigen("");
    setFilterZona("");
  }

  const supabase = useMemo(() => createClient(), []);
  const { toasts, toast } = useToast();

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
      zona_deseada: pedido.zona_deseada,
      presupuesto: pedido.presupuesto,
      compra_alquiler: pedido.compra_alquiler,
      habitaciones: pedido.habitaciones,
      garaje: pedido.garaje,
      origen: pedido.origen,
      referencia: pedido.referencia,
      notas: pedido.notas,
      visibility: normalizeAccessScope(pedido.visibility),
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
      zona_deseada: form.zona_deseada || null,
      presupuesto: form.presupuesto || null,
      compra_alquiler: form.compra_alquiler,
      habitaciones: form.habitaciones || null,
      garaje: form.garaje,
      origen: form.origen || null,
      referencia: form.referencia || null,
      notas: form.notas || null,
      visibility: normalizeAccessScope(form.visibility),
    };

    if (editId !== null) {
      const { data, error } = await supabase
        .from("pedidos")
        .update(payload)
        .eq("id", editId)
        .select()
        .single();

      if (error) {
        setSaveError(error.message);
      } else if (data) {
        setPedidos((prev) =>
          prev.map((pedido) => (pedido.id === editId ? (data as Pedido) : pedido))
        );
        toast("Solicitud actualizada");
        setModalOpen(false);
      }
    } else {
      const { data, error } = await supabase
        .from("pedidos")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setSaveError(error.message);
      } else if (data) {
        setPedidos((prev) => [data as Pedido, ...prev]);
        toast("Solicitud creada");
        setModalOpen(false);
      }
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;

    setDeleting(true);

    const { error } = await supabase.from("pedidos").delete().eq("id", deleteId);

    if (error) {
      toast(`Error al eliminar: ${error.message}`, "error");
    } else {
      setPedidos((prev) => prev.filter((pedido) => pedido.id !== deleteId));
      toast("Solicitud eliminada");
      setDeleteId(null);
    }

    setDeleting(false);
  }

  function formatPresupuesto(value: number | null) {
    if (!value) return "-";

    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function scopeBadge(scope: Pedido["visibility"]) {
    const normalized = normalizeAccessScope(scope);

    return (
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ACCESS_SCOPE_BADGES[normalized]}`}
      >
        {ACCESS_SCOPE_LABELS[normalized]}
      </span>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Solicitudes</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {filtered.length} {filtered.length === 1 ? "solicitud" : "solicitudes"}
            {hasFilters && pedidos.length !== filtered.length && (
              <span className="ml-1 text-text-secondary">de {pedidos.length}</span>
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Nueva solicitud
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="input h-9 py-0 text-sm"
        >
          <option value="">Tipo: todos</option>
          {TIPOS_PROPIEDAD.map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>
        <select
          value={filterModalidad}
          onChange={(e) => setFilterModalidad(e.target.value)}
          className="input h-9 py-0 text-sm"
        >
          <option value="">Modalidad: todas</option>
          <option value="compra">Compra</option>
          <option value="alquiler">Alquiler</option>
        </select>
        <select
          value={filterOrigen}
          onChange={(e) => setFilterOrigen(e.target.value)}
          className="input h-9 py-0 text-sm"
        >
          <option value="">Origen: todos</option>
          <option value="oficina">Oficina</option>
          <option value="online">Online</option>
        </select>
        <select
          value={filterZona}
          onChange={(e) => setFilterZona(e.target.value)}
          className="input h-9 py-0 text-sm"
        >
          <option value="">Zona: todas</option>
          {zonas.map((zona) => (
            <option key={zona.id} value={String(zona.id)}>{zona.nombre}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {pedidos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">
            No hay solicitudes todavia
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Crea la primera solicitud para empezar
          </p>
          <button
            onClick={openCreate}
            className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nueva solicitud
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">
            No hay solicitudes con estos filtros
          </p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-5 py-3 text-left font-medium text-text-secondary">
                  Cliente
                </th>
                <th className="px-5 py-3 text-left font-medium text-text-secondary">
                  Tipo
                </th>
                <th className="w-28 px-5 py-3 text-center font-medium text-text-secondary">
                  Modalidad
                </th>
                <th className="w-32 px-5 py-3 text-right font-medium text-text-secondary">
                  Presupuesto
                </th>
                <th className="w-20 px-5 py-3 text-center font-medium text-text-secondary">
                  Hab.
                </th>
                <th className="w-20 px-5 py-3 text-center font-medium text-text-secondary">
                  Garaje
                </th>
                <th className="w-28 px-5 py-3 text-center font-medium text-text-secondary">
                  Origen
                </th>
                <th className="w-28 px-5 py-3 text-center font-medium text-text-secondary">
                  Alcance
                </th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((pedido) => (
                <tr
                  key={pedido.id}
                  onClick={() => openEdit(pedido)}
                  className="group cursor-pointer transition-colors hover:bg-background"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-text-primary">
                      {pedido.nombre_cliente}
                    </p>
                    {pedido.telefono && (
                      <p className="text-xs text-text-secondary">
                        {pedido.telefono}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary">
                    {pedido.tipo_propiedad ?? "-"}
                  </td>
                  <td className="w-28 px-5 py-3.5 text-center">
                    {pedido.compra_alquiler === true ? (
                      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Compra
                      </span>
                    ) : pedido.compra_alquiler === false ? (
                      <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Alquiler
                      </span>
                    ) : (
                      <span className="text-text-secondary">-</span>
                    )}
                  </td>
                  <td className="w-32 px-5 py-3.5 text-right font-medium text-text-primary">
                    {formatPresupuesto(pedido.presupuesto)}
                  </td>
                  <td className="w-20 px-5 py-3.5 text-center text-text-secondary">
                    {pedido.habitaciones ?? "-"}
                  </td>
                  <td className="w-20 px-5 py-3.5 text-center">
                    {pedido.garaje === true ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mx-auto h-4 w-4 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : pedido.garaje === false ? (
                      <span className="text-xs text-text-secondary">No</span>
                    ) : (
                      <span className="text-text-secondary">-</span>
                    )}
                  </td>
                  <td className="w-28 px-5 py-3.5 text-center">
                    {pedido.origen === "oficina" ? (
                      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Oficina
                      </span>
                    ) : pedido.origen === "online" ? (
                      <span className="inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        Online
                      </span>
                    ) : (
                      <span className="text-text-secondary">-</span>
                    )}
                  </td>
                  <td className="w-28 px-5 py-3.5 text-center">
                    {scopeBadge(pedido.visibility)}
                  </td>
                  <td className="w-12 px-5 py-3.5 text-right">
                    {canManagePedido(
                      pedido,
                      currentUserId,
                      currentUserRole
                    ) && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteId(pedido.id);
                        }}
                        className="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                        title="Eliminar pedido"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editId !== null ? "Editar solicitud" : "Nueva solicitud"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Nombre del cliente *
                </label>
                <input
                  type="text"
                  value={form.nombre_cliente}
                  onChange={(e) =>
                    setForm({ ...form, nombre_cliente: e.target.value })
                  }
                  placeholder="Nombre completo"
                  className="input mt-1.5"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={form.telefono ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, telefono: e.target.value || null })
                    }
                    placeholder="600 000 000"
                    className="input mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Tipo de propiedad
                  </label>
                  <select
                    value={form.tipo_propiedad ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tipo_propiedad: e.target.value || null,
                      })
                    }
                    className="input mt-1.5"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_PROPIEDAD.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Modalidad
                  </label>
                  <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, compra_alquiler: true })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        form.compra_alquiler === true
                          ? "bg-primary text-white"
                          : "bg-surface text-text-secondary hover:bg-background"
                      }`}
                    >
                      Compra
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, compra_alquiler: false })
                      }
                      className={`flex-1 border-l border-border py-2 text-sm font-medium transition-colors ${
                        form.compra_alquiler === false
                          ? "bg-primary text-white"
                          : "bg-surface text-text-secondary hover:bg-background"
                      }`}
                    >
                      Alquiler
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Origen
                  </label>
                  <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, origen: "oficina" })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        form.origen === "oficina"
                          ? "bg-primary text-white"
                          : "bg-surface text-text-secondary hover:bg-background"
                      }`}
                    >
                      Oficina
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, origen: "online" })}
                      className={`flex-1 border-l border-border py-2 text-sm font-medium transition-colors ${
                        form.origen === "online"
                          ? "bg-primary text-white"
                          : "bg-surface text-text-secondary hover:bg-background"
                      }`}
                    >
                      Online
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Zona deseada
                  </label>
                  <select
                    value={form.zona_deseada ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        zona_deseada: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    className="input mt-1.5"
                  >
                    <option value="">Cualquier zona</option>
                    {zonas.map((zona) => (
                      <option key={zona.id} value={zona.id}>
                        {zona.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Presupuesto (EUR)
                  </label>
                  <input
                    type="number"
                    value={form.presupuesto ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        presupuesto: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="150000"
                    min={0}
                    className="input mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Habitaciones
                  </label>
                  <input
                    type="number"
                    value={form.habitaciones ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        habitaciones: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="3"
                    min={0}
                    className="input mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Garaje
                  </label>
                  <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, garaje: true })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        form.garaje === true
                          ? "bg-primary text-white"
                          : "bg-surface text-text-secondary hover:bg-background"
                      }`}
                    >
                      Si
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, garaje: false })}
                      className={`flex-1 border-l border-border py-2 text-sm font-medium transition-colors ${
                        form.garaje === false
                          ? "bg-primary text-white"
                          : "bg-surface text-text-secondary hover:bg-background"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Alcance del contenido
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(["private", "team", "company"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setForm({ ...form, visibility: scope })}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        normalizeAccessScope(form.visibility) === scope
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-background text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {ACCESS_SCOPE_LABELS[scope]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Privado: solo propietario. Equipo: visible a tu equipo.
                  Empresa: visible a toda la empresa.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Referencia de inmueble
                </label>
                <input
                  type="text"
                  value={form.referencia ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, referencia: e.target.value || null })
                  }
                  placeholder="Ref. o descripcion del inmueble"
                  className="input mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Notas
                </label>
                <textarea
                  value={form.notas ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, notas: e.target.value || null })
                  }
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  className="input mt-1.5 resize-none"
                />
              </div>

              {saveError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  {saveError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre_cliente.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {saving
                  ? "Guardando..."
                  : editId !== null
                    ? "Guardar cambios"
                    : "Crear solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-text-primary">
              Eliminar solicitud
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Esta accion no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
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
