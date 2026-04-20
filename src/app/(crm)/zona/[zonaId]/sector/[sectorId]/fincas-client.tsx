"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { deleteFincaAction } from "@/app/actions/security";
import { updateFincasPosicionesAction } from "@/app/(crm)/zona/actions";
import Breadcrumb from "@/components/ui/breadcrumb";
import DeleteConfirmationDialog from "@/components/ui/delete-confirmation-dialog";
import { useToast, Toaster } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase-browser";

type Finca = {
  id: number;
  numero: string;
  posicion: number | null;
  propiedades: Array<{ id: number }>;
};

type Props = {
  zonaId: number;
  zonaNombre: string;
  sectorId: number;
  sectorNumero: number;
  initialFincas: Finca[];
  canDeleteFincas: boolean;
};

export default function FincasClient({
  zonaId,
  zonaNombre,
  sectorId,
  sectorNumero,
  initialFincas,
  canDeleteFincas,
}: Props) {
  const [fincas, setFincas] = useState<Finca[]>(
    initialFincas.map((f, i) => ({ ...f, posicion: f.posicion ?? i }))
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toasts, toast } = useToast();

  async function handleCreate() {
    if (!numero.trim()) return;

    setSaving(true);

    const { data, error: err } = await supabase
      .from("fincas")
      .insert({ numero: numero.trim(), sector_id: sectorId })
      .select("id, numero, posicion, propiedades(id)")
      .single();

    if (err) {
      toast(`Error al crear la finca: ${err.message}`, "error");
    } else if (data) {
      setFincas((prev) => [...prev, data as Finca]);
      toast("Finca creada correctamente");
    }

    setNumero("");
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;

    setDeleting(true);
    setError(null);

    const result = await deleteFincaAction({
      fincaId: deleteId,
      password: deletePassword,
    });

    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    setFincas((prev) => prev.filter((finca) => finca.id !== deleteId));
    setDeleting(false);
    setDeleteId(null);
    setDeletePassword("");
    toast("Finca eliminada");
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    let nextState: Finca[] = [];
    setFincas((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      nextState = reordered.map((f, i) => ({ ...f, posicion: i }));
      return nextState;
    });

    setTimeout(() => {
      const positions = nextState.map((f) => ({ id: f.id, posicion: f.posicion ?? 0 }));
      updateFincasPosicionesAction(positions).then(({ error }) => {
        if (error) console.warn("Error al guardar orden:", error);
      });
    }, 0);
  }

  const DragHandle = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
  );

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Zonas", href: "/zona" },
          { label: zonaNombre, href: `/zona/${zonaId}` },
          { label: `Sector ${sectorNumero}` },
        ]}
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.push(`/zona/${zonaId}`)}
            className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            title="Volver a sectores"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="break-words text-2xl font-bold text-text-primary">
              Sector {sectorNumero}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {fincas.length} {fincas.length === 1 ? "finca" : "fincas"} en este sector
            </p>
          </div>
        </div>
        <button
          onClick={() => { setModalOpen(true); setNumero(""); }}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark sm:w-auto"
        >
          + Nueva finca
        </button>
      </div>

      {fincas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">No hay fincas todavia</p>
          <p className="mt-1 text-sm text-text-secondary">Anade la primera finca a este sector</p>
          <button
            onClick={() => { setModalOpen(true); setNumero(""); }}
            className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nueva finca
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          {/* Mobile */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="fincas-mobile" direction="vertical">
              {(provided) => (
                <div
                  className="divide-y divide-border md:hidden"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {fincas.map((finca, index) => {
                    const propiedadCount = finca.propiedades?.length ?? 0;
                    return (
                      <Draggable key={finca.id} draggableId={`m-${finca.id}`} index={index}>
                        {(drag, snapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={`flex items-center gap-2 px-4 py-4 transition-colors hover:bg-background ${snapshot.isDragging ? "opacity-90 shadow-lg" : ""}`}
                          >
                            <div
                              {...drag.dragHandleProps}
                              className="flex cursor-grab items-center justify-center text-text-secondary opacity-30 hover:opacity-70 active:cursor-grabbing"
                            >
                              <DragHandle />
                            </div>
                            <div
                              className="min-w-0 flex-1 cursor-pointer"
                              onClick={() => router.push(`/zona/${zonaId}/sector/${sectorId}/finca/${finca.id}`)}
                            >
                              <p className="break-words font-medium text-text-primary">{finca.numero}</p>
                              <p className="mt-1 text-xs text-text-secondary">
                                {propiedadCount} {propiedadCount === 1 ? "propiedad" : "propiedades"}
                              </p>
                            </div>
                            {canDeleteFincas && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setError(null); setDeletePassword(""); setDeleteId(finca.id); }}
                                className="rounded p-1 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                                title="Eliminar finca"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Desktop */}
          <table className="hidden w-full min-w-[420px] text-sm md:table">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="w-8 px-2 py-3" />
                <th className="px-5 py-3 text-left font-medium text-text-secondary">Finca</th>
                <th className="w-32 px-5 py-3 text-center font-medium text-text-secondary">Propiedades</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fincas-table" direction="vertical">
                {(provided) => (
                  <tbody
                    className="divide-y divide-border"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {fincas.map((finca, index) => {
                      const propiedadCount = finca.propiedades?.length ?? 0;
                      return (
                        <Draggable key={finca.id} draggableId={String(finca.id)} index={index}>
                          {(drag, snapshot) => (
                            <tr
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              className={`group cursor-pointer transition-colors hover:bg-background ${snapshot.isDragging ? "opacity-90 shadow-lg" : ""}`}
                            >
                              <td className="w-8 px-2 py-3">
                                <div
                                  {...drag.dragHandleProps}
                                  className="flex cursor-grab items-center justify-center text-text-secondary opacity-30 hover:opacity-70 active:cursor-grabbing"
                                  title="Arrastrar para reordenar"
                                >
                                  <DragHandle />
                                </div>
                              </td>
                              <td
                                className="px-5 py-3.5 font-medium text-text-primary"
                                onClick={() => router.push(`/zona/${zonaId}/sector/${sectorId}/finca/${finca.id}`)}
                              >
                                {finca.numero}
                              </td>
                              <td
                                className="w-32 px-5 py-3.5 text-center text-text-secondary"
                                onClick={() => router.push(`/zona/${zonaId}/sector/${sectorId}/finca/${finca.id}`)}
                              >
                                {propiedadCount}
                              </td>
                              <td className="w-12 px-5 py-3.5 text-right">
                                {canDeleteFincas && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setError(null); setDeletePassword(""); setDeleteId(finca.id); }}
                                    className="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                                    title="Eliminar finca"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Nueva finca</h2>
              <button onClick={() => setModalOpen(false)} className="text-text-secondary transition-colors hover:text-text-primary">×</button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-text-secondary">Nombre de la finca</label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Ej: Las Palmeras"
                className="input mt-1.5"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !numero.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60">
                {saving ? "Creando..." : "Crear finca"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <DeleteConfirmationDialog
          title="Eliminar finca"
          description="Se eliminaran todas las propiedades asociadas. Esta accion no se puede deshacer."
          password={deletePassword}
          error={error}
          pending={deleting}
          onPasswordChange={setDeletePassword}
          onCancel={() => { setDeleteId(null); setDeletePassword(""); setError(null); }}
          onConfirm={handleDelete}
        />
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
