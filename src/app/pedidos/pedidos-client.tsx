"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
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
};

type Props = {
  initialPedidos: Pedido[];
  zonas: Zona[];
};

const TIPOS_PROPIEDAD = ["Piso", "Casa", "Chalet", "Local", "Nave", "Garaje", "Terreno", "Otro"];

function emptyForm(): Omit<Pedido, "id"> {
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
  };
}

export default function PedidosClient({ initialPedidos, zonas }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        setPedidos((prev) => prev.map((p) => (p.id === editId ? (data as Pedido) : p)));
        toast("Pedido actualizado");
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
        toast("Pedido creado");
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
      toast("Error al eliminar: " + error.message, "error");
    } else {
      setPedidos((prev) => prev.filter((p) => p.id !== deleteId));
      toast("Pedido eliminado");
      setDeleteId(null);
    }
    setDeleting(false);
  }

  function formatPresupuesto(v: number | null) {
    if (!v) return "—";
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(v);
  }

  function zonaNombre(id: number | null) {
    if (!id) return "—";
    return zonas.find((z) => z.id === id)?.nombre ?? "—";
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pedidos</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Nuevo pedido
        </button>
      </div>

      {/* List */}
      {pedidos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">No hay pedidos todavía</p>
          <p className="mt-1 text-sm text-text-secondary">Crea el primer pedido para empezar</p>
          <button
            onClick={openCreate}
            className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nuevo pedido
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-5 py-3 text-left font-medium text-text-secondary">Cliente</th>
                <th className="px-5 py-3 text-left font-medium text-text-secondary">Tipo</th>
                <th className="w-28 px-5 py-3 text-center font-medium text-text-secondary">Modalidad</th>
                <th className="w-32 px-5 py-3 text-right font-medium text-text-secondary">Presupuesto</th>
                <th className="w-20 px-5 py-3 text-center font-medium text-text-secondary">Hab.</th>
                <th className="w-20 px-5 py-3 text-center font-medium text-text-secondary">Garaje</th>
                <th className="w-28 px-5 py-3 text-center font-medium text-text-secondary">Origen</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pedidos.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className="group cursor-pointer transition-colors hover:bg-background"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-text-primary">{p.nombre_cliente}</p>
                    {p.telefono && (
                      <p className="text-xs text-text-secondary">{p.telefono}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary">{p.tipo_propiedad ?? "—"}</td>
                  <td className="w-28 px-5 py-3.5 text-center">
                    {p.compra_alquiler === true ? (
                      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Compra
                      </span>
                    ) : p.compra_alquiler === false ? (
                      <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Alquiler
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="w-32 px-5 py-3.5 text-right font-medium text-text-primary">
                    {formatPresupuesto(p.presupuesto)}
                  </td>
                  <td className="w-20 px-5 py-3.5 text-center text-text-secondary">
                    {p.habitaciones ?? "—"}
                  </td>
                  <td className="w-20 px-5 py-3.5 text-center">
                    {p.garaje === true ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : p.garaje === false ? (
                      <span className="text-text-secondary text-xs">No</span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="w-28 px-5 py-3.5 text-center">
                    {p.origen === "oficina" ? (
                      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Oficina
                      </span>
                    ) : p.origen === "online" ? (
                      <span className="inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        Online
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="w-12 px-5 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(p.id);
                      }}
                      className="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-red-50 hover:text-danger group-hover:opacity-100"
                      title="Eliminar pedido"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editId !== null ? "Editar pedido" : "Nuevo pedido"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-xs font-medium text-text-secondary">Nombre del cliente *</label>
                <input
                  type="text"
                  value={form.nombre_cliente}
                  onChange={(e) => setForm({ ...form, nombre_cliente: e.target.value })}
                  placeholder="Nombre completo"
                  className="input mt-1.5"
                  autoFocus
                />
              </div>

              {/* Teléfono + Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Teléfono</label>
                  <input
                    type="tel"
                    value={form.telefono ?? ""}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value || null })}
                    placeholder="600 000 000"
                    className="input mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">Tipo de propiedad</label>
                  <select
                    value={form.tipo_propiedad ?? ""}
                    onChange={(e) => setForm({ ...form, tipo_propiedad: e.target.value || null })}
                    className="input mt-1.5"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_PROPIEDAD.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modalidad + Origen */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Modalidad</label>
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
                      onClick={() => setForm({ ...form, compra_alquiler: false })}
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
                  <label className="text-xs font-medium text-text-secondary">Origen</label>
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

              {/* Zona + Presupuesto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Zona deseada</label>
                  <select
                    value={form.zona_deseada ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, zona_deseada: e.target.value ? Number(e.target.value) : null })
                    }
                    className="input mt-1.5"
                  >
                    <option value="">Cualquier zona</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={z.id}>{z.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">Presupuesto (€)</label>
                  <input
                    type="number"
                    value={form.presupuesto ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, presupuesto: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="150000"
                    min={0}
                    className="input mt-1.5"
                  />
                </div>
              </div>

              {/* Habitaciones + Garaje */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Habitaciones</label>
                  <input
                    type="number"
                    value={form.habitaciones ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, habitaciones: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="3"
                    min={0}
                    className="input mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">Garaje</label>
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
                      Sí
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

              {/* Referencia */}
              <div>
                <label className="text-xs font-medium text-text-secondary">Referencia de inmueble</label>
                <input
                  type="text"
                  value={form.referencia ?? ""}
                  onChange={(e) => setForm({ ...form, referencia: e.target.value || null })}
                  placeholder="Ref. o descripción del inmueble"
                  className="input mt-1.5"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-medium text-text-secondary">Notas</label>
                <textarea
                  value={form.notas ?? ""}
                  onChange={(e) => setForm({ ...form, notas: e.target.value || null })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  className="input mt-1.5 resize-none"
                />
              </div>

              {saveError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{saveError}</p>
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
                {saving ? "Guardando..." : editId !== null ? "Guardar cambios" : "Crear pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-text-primary">Eliminar pedido</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Esta acción no se puede deshacer.
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
