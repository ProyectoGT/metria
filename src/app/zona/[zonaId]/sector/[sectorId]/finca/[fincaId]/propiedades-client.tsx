"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Agente = {
  id: number;
  nombre: string;
  apellidos: string;
};

type Propiedad = {
  id: number;
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
  estado: string | null;
  fecha_visita: string | null;
  notas: string | null;
  agente_asignado: number | null;
  finca_id: number | null;
  usuarios: { id: number; nombre: string; apellidos: string } | null;
};

type FormData = {
  planta: string;
  puerta: string;
  propietario: string;
  telefono: string;
  estado: string;
  fecha_visita: string;
  notas: string;
  agente_asignado: string;
};

const ESTADOS = [
  { value: "disponible", label: "Disponible", classes: "bg-green-100 text-green-800" },
  { value: "en_proceso", label: "En proceso", classes: "bg-amber-100 text-amber-800" },
  { value: "vendido", label: "Vendido", classes: "bg-blue-100 text-blue-800" },
  { value: "alquilado", label: "Alquilado", classes: "bg-purple-100 text-purple-800" },
  { value: "no_disponible", label: "No disponible", classes: "bg-gray-100 text-gray-600" },
] as const;

function estadoClasses(estado: string | null) {
  const found = ESTADOS.find((e) => e.value === estado);
  return found?.classes ?? "bg-gray-100 text-gray-500";
}

function estadoLabel(estado: string | null) {
  const found = ESTADOS.find((e) => e.value === estado);
  return found?.label ?? estado ?? "—";
}

const EMPTY_FORM: FormData = {
  planta: "",
  puerta: "",
  propietario: "",
  telefono: "",
  estado: "disponible",
  fecha_visita: "",
  notas: "",
  agente_asignado: "",
};

export default function PropiedadesClient({
  fincaId,
  initialPropiedades,
  agentes,
}: {
  fincaId: number;
  initialPropiedades: Propiedad[];
  agentes: Agente[];
}) {
  const [propiedades, setPropiedades] = useState<Propiedad[]>(initialPropiedades);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Propiedad | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: Propiedad) {
    setEditTarget(p);
    setForm({
      planta: p.planta ?? "",
      puerta: p.puerta ?? "",
      propietario: p.propietario ?? "",
      telefono: p.telefono ?? "",
      estado: p.estado ?? "disponible",
      fecha_visita: p.fecha_visita ?? "",
      notas: p.notas ?? "",
      agente_asignado: p.agente_asignado?.toString() ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
  }

  function setField(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      planta: form.planta || null,
      puerta: form.puerta || null,
      propietario: form.propietario || null,
      telefono: form.telefono || null,
      estado: form.estado || null,
      fecha_visita: form.fecha_visita || null,
      notas: form.notas || null,
      agente_asignado: form.agente_asignado ? Number(form.agente_asignado) : null,
    };

    if (editTarget) {
      const { data } = await supabase
        .from("propiedades")
        .update(payload)
        .eq("id", editTarget.id)
        .select("*, usuarios(id, nombre, apellidos)")
        .single();
      if (data) {
        setPropiedades((prev) =>
          prev.map((p) => (p.id === editTarget.id ? (data as Propiedad) : p))
        );
      }
    } else {
      const { data } = await supabase
        .from("propiedades")
        .insert({ ...payload, finca_id: fincaId })
        .select("*, usuarios(id, nombre, apellidos)")
        .single();
      if (data) {
        setPropiedades((prev) => [...prev, data as Propiedad]);
      }
    }

    setSaving(false);
    closeModal();
  }

  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    await supabase.from("propiedades").delete().eq("id", deleteId);
    setPropiedades((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleting(false);
    setDeleteId(null);
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {propiedades.length}{" "}
          {propiedades.length === 1 ? "propiedad" : "propiedades"}
        </p>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Nueva propiedad
        </button>
      </div>

      {/* Table */}
      {propiedades.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-text-secondary">No hay propiedades registradas.</p>
          <button
            onClick={openCreate}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Añadir la primera propiedad
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Planta</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Puerta</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Propietario</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Teléfono</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Última visita</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Agente</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {propiedades.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-background">
                  <td className="px-4 py-3 text-text-primary">{p.planta ?? "—"}</td>
                  <td className="px-4 py-3 text-text-primary">{p.puerta ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">{p.propietario ?? "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.telefono ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.estado ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClasses(p.estado)}`}>
                        {estadoLabel(p.estado)}
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {p.fecha_visita
                      ? new Date(p.fecha_visita).toLocaleDateString("es-ES")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {p.usuarios ? `${p.usuarios.nombre} ${p.usuarios.apellidos}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-blue-50 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-danger hover:bg-red-50 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editTarget ? "Editar propiedad" : "Nueva propiedad"}
              </h2>
              <button
                onClick={closeModal}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Planta">
                  <input
                    type="text"
                    value={form.planta}
                    onChange={(e) => setField("planta", e.target.value)}
                    placeholder="Ej: 3ª"
                    className="input"
                  />
                </FormField>
                <FormField label="Puerta">
                  <input
                    type="text"
                    value={form.puerta}
                    onChange={(e) => setField("puerta", e.target.value)}
                    placeholder="Ej: B"
                    className="input"
                  />
                </FormField>
              </div>

              <FormField label="Propietario">
                <input
                  type="text"
                  value={form.propietario}
                  onChange={(e) => setField("propietario", e.target.value)}
                  placeholder="Nombre del propietario"
                  className="input"
                />
              </FormField>

              <FormField label="Teléfono">
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setField("telefono", e.target.value)}
                  placeholder="600 000 000"
                  className="input"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Estado">
                  <select
                    value={form.estado}
                    onChange={(e) => setField("estado", e.target.value)}
                    className="input"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Fecha de visita">
                  <input
                    type="date"
                    value={form.fecha_visita}
                    onChange={(e) => setField("fecha_visita", e.target.value)}
                    className="input"
                  />
                </FormField>
              </div>

              <FormField label="Agente asignado">
                <select
                  value={form.agente_asignado}
                  onChange={(e) => setField("agente_asignado", e.target.value)}
                  className="input"
                >
                  <option value="">Sin asignar</option>
                  {agentes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.apellidos}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Notas">
                <textarea
                  value={form.notas}
                  onChange={(e) => setField("notas", e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  className="input resize-none"
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {saving ? "Guardando..." : editTarget ? "Guardar cambios" : "Crear propiedad"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-text-primary">
              Eliminar propiedad
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Esta acción no se puede deshacer. ¿Seguro que quieres eliminar esta propiedad?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  );
}
