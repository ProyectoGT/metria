"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { deletePropiedadAction } from "@/app/actions/security";
import { createTareaAction } from "@/app/(crm)/dashboard/actions";
import DeleteConfirmationDialog from "@/components/ui/delete-confirmation-dialog";
import { useToast, Toaster } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase-browser";
import EncargoPanel from "@/components/propiedades/EncargoPanel";

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
  latitud?: number | null;
  longitud?: number | null;
  usuarios: { id: number; nombre: string; apellidos: string } | null;
  // Orden local (no en BD, solo para UI)
  _order?: number;
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
  latitud: string;
  longitud: string;
};

type ReminderForm = {
  fecha: string;
  hora: string;
  nota: string;
};

const ESTADOS = [
  { value: "neutral", label: "Neutral", classes: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400" },
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
  { value: "encargo", label: "Encargo", classes: "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  { value: "vendido", label: "Vendido", classes: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
] as const;

// Estados que se consideran "sin contactar" (pendientes)
const ESTADOS_SIN_CONTACTAR = ["neutral", "investigacion"];

function estadoClasses(estado: string | null) {
  const found = ESTADOS.find((item) => item.value === estado);
  return found?.classes ?? "bg-gray-500/15 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400";
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

function isPendienteContactar(propiedad: Propiedad): boolean {
  const sinEstado = !propiedad.estado || ESTADOS_SIN_CONTACTAR.includes(propiedad.estado);
  const sinVisita = !propiedad.fecha_visita;
  return sinEstado && sinVisita;
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
  latitud: "",
  longitud: "",
};

const EMPTY_REMINDER: ReminderForm = {
  fecha: "",
  hora: "",
  nota: "",
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
  const [propiedades, setPropiedades] = useState<Propiedad[]>(
    initialPropiedades.map((p, i) => ({ ...p, _order: i }))
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Propiedad | null>(null);
  const [encargoPropiedad, setEncargoPropiedad] = useState<Propiedad | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  // Filtro pendientes
  const [filtroPendientes, setFiltroPendientes] = useState(false);

  // Recordatorio modal
  const [reminderPropiedad, setReminderPropiedad] = useState<Propiedad | null>(null);
  const [reminderForm, setReminderForm] = useState<ReminderForm>(EMPTY_REMINDER);
  const [reminderSaving, setReminderSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toasts, toast } = useToast();

  // Propiedades filtradas
  const propiedadesFiltradas = filtroPendientes
    ? propiedades.filter(isPendienteContactar)
    : propiedades;

  // Cuántas están pendientes de contactar (para badge del filtro)
  const pendientesCount = propiedades.filter(isPendienteContactar).length;

  // Cuántas tienen overdue 90 días
  const overdueCount = propiedades.filter((p) => isOverdue(p.fecha_visita)).length;

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
      latitud: propiedad.latitud != null ? propiedad.latitud.toString() : "",
      longitud: propiedad.longitud != null ? propiedad.longitud.toString() : "",
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

  function openReminder(propiedad: Propiedad) {
    setReminderPropiedad(propiedad);
    // Si tiene visita, precarga la fecha + 90 días como sugerencia
    if (propiedad.fecha_visita) {
      const suggested = new Date(propiedad.fecha_visita);
      suggested.setDate(suggested.getDate() + 90);
      const yyyy = suggested.getFullYear();
      const mm = String(suggested.getMonth() + 1).padStart(2, "0");
      const dd = String(suggested.getDate()).padStart(2, "0");
      setReminderForm({ fecha: `${yyyy}-${mm}-${dd}`, hora: "10:00", nota: "" });
    } else {
      setReminderForm(EMPTY_REMINDER);
    }
  }

  function closeReminder() {
    setReminderPropiedad(null);
    setReminderForm(EMPTY_REMINDER);
  }

  async function handleSaveReminder() {
    if (!reminderPropiedad || !reminderForm.fecha) return;
    setReminderSaving(true);

    const fechaHora = reminderForm.hora
      ? `${reminderForm.fecha}T${reminderForm.hora}:00`
      : `${reminderForm.fecha}T09:00:00`;

    const propDesc = reminderPropiedad.propietario
      ?? `Planta ${reminderPropiedad.planta ?? "-"} Puerta ${reminderPropiedad.puerta ?? "-"}`;
    const notaSufijo = reminderForm.nota ? ` — ${reminderForm.nota}` : "";
    const titulo = `Recordatorio: ${propDesc}${notaSufijo}`.slice(0, 200);

    try {
      await createTareaAction({ titulo, prioridad: "media", fecha: fechaHora });
      toast("Recordatorio creado — aparecera en notificaciones");
      closeReminder();
    } catch (err) {
      toast(`Error al crear recordatorio: ${err instanceof Error ? err.message : "Error desconocido"}`, "error");
    }
    setReminderSaving(false);
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
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
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
            propiedad.id === editTarget.id
              ? { ...(data as Propiedad), _order: propiedad._order }
              : propiedad
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
        const newOrder = propiedades.length;
        setPropiedades((prev) => [...prev, { ...(data as Propiedad), _order: newOrder }]);
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

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    // Reordenar dentro de la lista filtrada o completa
    const lista = filtroPendientes ? propiedadesFiltradas : propiedades;
    const ids = lista.map((p) => p.id);
    const reordered = [...ids];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    // Reconstruir el orden completo
    setPropiedades((prev) => {
      const orderMap = new Map<number, number>();
      reordered.forEach((id, idx) => orderMap.set(id, idx));

      if (filtroPendientes) {
        // Mantener el orden de los no-filtrados intercalado
        const allIds = prev.map((p) => p.id);
        const newOrder: Propiedad[] = [];
        let filtIdx = 0;
        for (const id of allIds) {
          const p = prev.find((x) => x.id === id)!;
          if (isPendienteContactar(p)) {
            const newId = reordered[filtIdx++];
            newOrder.push(prev.find((x) => x.id === newId)!);
          } else {
            newOrder.push(p);
          }
        }
        return newOrder.map((p, i) => ({ ...p, _order: i }));
      } else {
        return reordered.map((id, idx) => ({
          ...prev.find((p) => p.id === id)!,
          _order: idx,
        }));
      }
    });
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
            {propiedadesFiltradas.length}{" "}
            {propiedadesFiltradas.length === 1 ? "propiedad" : "propiedades"}
            {filtroPendientes && propiedades.length !== propiedadesFiltradas.length && (
              <span className="ml-1 text-text-secondary">
                de {propiedades.length}
              </span>
            )}
          </p>

          {/* Filtro pendientes de contactar */}
          {pendientesCount > 0 && (
            <button
              onClick={() => setFiltroPendientes((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroPendientes
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
              }`}
              title="Propiedades sin estado de seguimiento ni visita registrada"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              Pendientes de contactar
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  filtroPendientes ? "bg-white/30 text-white" : "bg-amber-200 text-amber-800"
                }`}
              >
                {pendientesCount}
              </span>
            </button>
          )}

          {/* Aviso overdue 90 días */}
          {overdueCount > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
              title="Propiedades con mas de 90 dias sin visita"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {overdueCount} sin visita +90d
            </span>
          )}
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Nueva propiedad
        </button>
      </div>

      {propiedadesFiltradas.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-text-secondary">
            {filtroPendientes
              ? "No hay propiedades pendientes de contactar."
              : "No hay propiedades registradas."}
          </p>
          {!filtroPendientes && (
            <button
              onClick={openCreate}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Anadir la primera propiedad
            </button>
          )}
          {filtroPendientes && (
            <button
              onClick={() => setFiltroPendientes(false)}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Ver todas las propiedades
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                {/* Columna drag handle */}
                <th className="w-8 px-2 py-3" />
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
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="propiedades-table" direction="vertical">
                {(provided) => (
                  <tbody
                    className="divide-y divide-border"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {propiedadesFiltradas.map((propiedad, index) => {
                      const overdue = isOverdue(propiedad.fecha_visita);
                      const isEncargo = propiedad.estado === "encargo";
                      const pendiente = isPendienteContactar(propiedad);

                      return (
                        <Draggable
                          key={propiedad.id}
                          draggableId={String(propiedad.id)}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <tr
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`transition-colors hover:bg-background ${
                                isEncargo ? "bg-green-50/40 dark:bg-green-950/10" : ""
                              } ${pendiente && !filtroPendientes ? "bg-amber-50/30 dark:bg-amber-950/10" : ""} ${
                                dragSnapshot.isDragging ? "opacity-90 shadow-lg" : ""
                              }`}
                            >
                              {/* Drag handle */}
                              <td className="w-8 px-2 py-3">
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="flex cursor-grab items-center justify-center text-text-secondary opacity-30 hover:opacity-70 active:cursor-grabbing"
                                  title="Arrastrar para reordenar"
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
                                      d="M4 8h16M4 16h16"
                                    />
                                  </svg>
                                </div>
                              </td>
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
                                  {/* Botón recordatorio */}
                                  <button
                                    onClick={() => openReminder(propiedad)}
                                    className="rounded px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-primary"
                                    title="Crear recordatorio o cita para esta propiedad"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                      />
                                    </svg>
                                  </button>
                                  {isEncargo && (
                                    <button
                                      onClick={() => setEncargoPropiedad(propiedad)}
                                      className="rounded px-2 py-1 text-xs font-semibold text-success transition-colors hover:bg-success/10"
                                    >
                                      Ver encargo
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openEdit(propiedad)}
                                    className="rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
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
                                      className="rounded px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </DragDropContext>
          </table>
        </div>
      )}

      {/* Modal recordatorio */}
      {reminderPropiedad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  Recordatorio / Cita
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {reminderPropiedad.propietario ?? `Planta ${reminderPropiedad.planta ?? "-"} Puerta ${reminderPropiedad.puerta ?? "-"}`}
                </p>
              </div>
              <button
                onClick={closeReminder}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {isOverdue(reminderPropiedad.fecha_visita) && (
                <div className="flex items-start gap-2 rounded-lg bg-accent/10 px-3 py-2.5 text-xs text-accent">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Han pasado mas de 90 dias desde la ultima visita. La fecha sugerida es
                    a los 90 dias de la ultima visita.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fecha *">
                  <input
                    type="date"
                    value={reminderForm.fecha}
                    onChange={(e) =>
                      setReminderForm((prev) => ({ ...prev, fecha: e.target.value }))
                    }
                    className="input"
                  />
                </FormField>
                <FormField label="Hora">
                  <input
                    type="time"
                    value={reminderForm.hora}
                    onChange={(e) =>
                      setReminderForm((prev) => ({ ...prev, hora: e.target.value }))
                    }
                    className="input"
                  />
                </FormField>
              </div>

              <FormField label="Nota (opcional)">
                <textarea
                  value={reminderForm.nota}
                  onChange={(e) =>
                    setReminderForm((prev) => ({ ...prev, nota: e.target.value }))
                  }
                  placeholder="Motivo de la cita o recordatorio..."
                  rows={2}
                  className="input resize-none"
                />
              </FormField>

              <p className="text-xs text-text-secondary">
                El recordatorio aparecera como tarea pendiente en el icono de notificaciones
                de la barra superior.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={closeReminder}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveReminder}
                disabled={reminderSaving || !reminderForm.fecha}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {reminderSaving ? "Guardando..." : "Crear recordatorio"}
              </button>
            </div>
          </div>
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

              {form.estado === "noticia" && (
                <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Ubicación en el mapa
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Latitud">
                      <input
                        type="number"
                        step="any"
                        value={form.latitud}
                        onChange={(e) => setField("latitud", e.target.value)}
                        placeholder="Ej: 41.3851"
                        className="input"
                      />
                    </FormField>
                    <FormField label="Longitud">
                      <input
                        type="number"
                        step="any"
                        value={form.longitud}
                        onChange={(e) => setField("longitud", e.target.value)}
                        placeholder="Ej: 2.1734"
                        className="input"
                      />
                    </FormField>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Abre{" "}
                    <a
                      href="https://maps.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Google Maps
                    </a>
                    , haz clic derecho sobre la dirección → &quot;¿Qué hay aquí?&quot; y copia las coordenadas.
                  </p>
                </div>
              )}

              {saveError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
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

      {encargoPropiedad && (
        <EncargoPanel
          propiedad={encargoPropiedad}
          onClose={() => setEncargoPropiedad(null)}
          onEdit={() => {
            setEncargoPropiedad(null);
            openEdit(encargoPropiedad);
          }}
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
