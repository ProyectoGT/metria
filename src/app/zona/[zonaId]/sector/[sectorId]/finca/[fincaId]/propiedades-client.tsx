"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deletePropiedadAction } from "@/app/actions/security";
import DeleteConfirmationDialog from "@/components/ui/delete-confirmation-dialog";
import { useToast, Toaster } from "@/components/ui/toast";
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
  { value: "neutral", label: "Neutral", classes: "bg-gray-100 text-gray-600" },
  {
    value: "investigacion",
    label: "Investigacion",
    classes: "bg-blue-100 text-blue-700",
  },
  {
    value: "seguimiento",
    label: "Seguimiento",
    classes: "bg-amber-100 text-amber-700",
  },
  { value: "noticia", label: "Noticia", classes: "bg-purple-100 text-purple-700" },
  { value: "encargo", label: "Encargo", classes: "bg-green-100 text-green-700" },
] as const;

function estadoClasses(estado: string | null) {
  const found = ESTADOS.find((item) => item.value === estado);
  return found?.classes ?? "bg-gray-100 text-gray-500";
}

function estadoLabel(estado: string | null) {
  const found = ESTADOS.find((item) => item.value === estado);
  return found?.label ?? estado ?? "-";
}

function isOverdue(fechaVisita: string | null): boolean {
  if (!fechaVisita) return false;
  const diffMs = Date.now() - new Date(fechaVisita).getTime();
  return diffMs > 90 * 24 * 60 * 60 * 1000;
}

const EMPTY_FORM: FormData = {
  planta: "",
  puerta: "",
  propietario: "",
  telefono: "",
  estado: "neutral",
  fecha_visita: "",
  notas: "",
  agente_asignado: "",
};

export default function PropiedadesClient({
  fincaId,
  initialPropiedades,
  agentes,
  canDeletePropiedades,
}: {
  fincaId: number;
  initialPropiedades: Propiedad[];
  agentes: Agente[];
  canDeletePropiedades: boolean;
}) {
  const [propiedades, setPropiedades] = useState<Propiedad[]>(initialPropiedades);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Propiedad | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toasts, toast } = useToast();

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(propiedad: Propiedad) {
    setEditTarget(propiedad);
    setSaveError(null);
    setForm({
      planta: propiedad.planta ?? "",
      puerta: propiedad.puerta ?? "",
      propietario: propiedad.propietario ?? "",
      telefono: propiedad.telefono ?? "",
      estado: propiedad.estado ?? "neutral",
      fecha_visita: propiedad.fecha_visita ?? "",
      notas: propiedad.notas ?? "",
      agente_asignado: propiedad.agente_asignado?.toString() ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
    setSaveError(null);
  }

  function setField(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

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
      const { data, error } = await supabase
        .from("propiedades")
        .update(payload)
        .eq("id", editTarget.id)
        .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos)")
        .single();

      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }

      if (data) {
        setPropiedades((prev) =>
          prev.map((propiedad) =>
            propiedad.id === editTarget.id ? (data as Propiedad) : propiedad
          )
        );
        toast("Propiedad actualizada correctamente");
      }
    } else {
      const { data, error } = await supabase
        .from("propiedades")
        .insert({ ...payload, finca_id: fincaId })
        .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos)")
        .single();

      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }

      if (data) {
        setPropiedades((prev) => [...prev, data as Propiedad]);
        toast("Propiedad creada correctamente");
      }
    }

    setSaving(false);
    closeModal();
  }

  async function handleDelete() {
    if (deleteId === null) return;

    setDeleting(true);
    setDeleteError(null);

    const result = await deletePropiedadAction({
      propiedadId: deleteId,
      password: deletePassword,
    });

    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }

    setPropiedades((prev) => prev.filter((propiedad) => propiedad.id !== deleteId));
    setDeleting(false);
    setDeleteId(null);
    setDeletePassword("");
    toast("Propiedad eliminada");
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            title="Volver"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <p className="text-sm text-text-secondary">
            {propiedades.length}{" "}
            {propiedades.length === 1 ? "propiedad" : "propiedades"}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Nueva propiedad
        </button>
      </div>

      {propiedades.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-text-secondary">No hay propiedades registradas.</p>
          <button
            onClick={openCreate}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Anadir la primera propiedad
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Planta
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Puerta
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Propietario
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Telefono
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Estado
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Ultima visita
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Agente
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {propiedades.map((propiedad) => {
                const overdue = isOverdue(propiedad.fecha_visita);

                return (
                  <tr
                    key={propiedad.id}
                    className="transition-colors hover:bg-background"
                  >
                    <td className="px-4 py-3 text-text-primary">
                      {propiedad.planta ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {propiedad.puerta ?? "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {propiedad.propietario ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {propiedad.telefono ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {propiedad.estado ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClasses(propiedad.estado)}`}
                        >
                          {estadoLabel(propiedad.estado)}
                        </span>
                      ) : (
                        <span className="text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {overdue && (
                          <span
                            title="Han pasado mas de 90 dias desde la ultima visita"
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                        <span
                          className={
                            overdue
                              ? "font-medium text-amber-600"
                              : "text-text-secondary"
                          }
                        >
                          {propiedad.fecha_visita
                            ? new Date(propiedad.fecha_visita).toLocaleDateString(
                                "es-ES"
                              )
                            : "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {propiedad.usuarios
                        ? `${propiedad.usuarios.nombre} ${propiedad.usuarios.apellidos}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(propiedad)}
                          className="rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-blue-50"
                        >
                          Editar
                        </button>
                        {canDeletePropiedades && (
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setDeletePassword("");
                              setDeleteId(propiedad.id);
                            }}
                            className="rounded px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editTarget ? "Editar propiedad" : "Nueva propiedad"}
              </h2>
              <button
                onClick={closeModal}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Planta">
                  <input
                    type="text"
                    value={form.planta}
                    onChange={(e) => setField("planta", e.target.value)}
                    placeholder="Ej: 3A"
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

              <FormField label="Telefono">
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
                    {ESTADOS.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
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
                  {agentes.map((agente) => (
                    <option key={agente.id} value={agente.id}>
                      {agente.nombre} {agente.apellidos}
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

              {saveError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">
                  {saveError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {saving
                  ? "Guardando..."
                  : editTarget
                    ? "Guardar cambios"
                    : "Crear propiedad"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <DeleteConfirmationDialog
          title="Eliminar propiedad"
          description="Esta accion no se puede deshacer. Introduce la contrasena de confirmacion para continuar."
          password={deletePassword}
          error={deleteError}
          pending={deleting}
          onPasswordChange={setDeletePassword}
          onCancel={() => {
            setDeleteId(null);
            setDeletePassword("");
            setDeleteError(null);
          }}
          onConfirm={handleDelete}
        />
      )}

      <Toaster toasts={toasts} />
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
