"use client";

import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import KanbanAddColumn from "./KanbanAddColumn";
import KanbanAddCard from "./KanbanAddCard";
import type { KanbanData, KanbanColumnData, KanbanCardData } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";
import {
  createTareaAction,
  deleteTareaAction,
  completeTareaAction,
  updateTareaEstadoAction,
  addKanbanColumnAction,
  deleteKanbanColumnAction,
} from "@/app/(crm)/dashboard/actions";

type KanbanBoardProps = {
  initialData: KanbanData;
  customColumns?: Array<{ id: string; title: string }>;
  role: UserRole;
  currentUserId: string;
  agents?: Array<{ id: string; nombre: string }>;
};

// Mapa columna-id → estado en BD
const COL_TO_ESTADO: Record<string, "pendiente" | "en_progreso" | "completado"> = {
  pendientes: "pendiente",
  en_progreso: "en_progreso",
  completado: "completado",
};

export default function KanbanBoard({
  initialData,
  customColumns = [],
  role,
  currentUserId: _currentUserId,
  agents = [],
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnData[]>(() => {
    const existingIds = new Set(initialData.columns.map((c) => c.id));
    const extra = customColumns
      .filter((c) => !existingIds.has(c.id))
      .map((c) => ({ ...c, fixed: false, cards: [] }));
    return [...initialData.columns, ...extra];
  });
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);

  // ─── Modal resultado ─────────────────────────────────────────────────────────
  const [resultadoModal, setResultadoModal] = useState<{
    columnId: string;
    cardId: string;
    titulo: string;
  } | null>(null);
  const [resultadoText, setResultadoText] = useState("");

  // ─── Drag & drop ────────────────────────────────────────────────────────────
  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find((c) => c.id === source.droppableId);
      const destCol = next.find((c) => c.id === destination.droppableId);
      if (!sourceCol || !destCol) return prev;

      const [moved] = sourceCol.cards.splice(source.index, 1);
      destCol.cards.splice(destination.index, 0, moved);
      return next;
    });

    // Si cambió de columna, persistir el nuevo estado en BD
    if (source.droppableId !== destination.droppableId) {
      const nuevoEstado = COL_TO_ESTADO[destination.droppableId];
      const numId = parseInt(draggableId, 10);
      if (nuevoEstado && !isNaN(numId)) {
        updateTareaEstadoAction(numId, nuevoEstado).catch((err) =>
          console.warn("Error al mover tarea:", err),
        );
      }
    }
  }

  // ─── Column ops ─────────────────────────────────────────────────────────────
  async function handleAddColumn(title: string) {
    const id = `col-${Date.now()}`;
    setColumns((prev) => [...prev, { id, title, fixed: false, cards: [] }]);
    try {
      const orden = columns.filter((c) => !c.fixed).length;
      await addKanbanColumnAction({ col_id: id, titulo: title, orden });
    } catch (err) {
      console.warn("Error al guardar columna:", err);
    }
  }

  async function handleDeleteColumn(columnId: string) {
    setColumns((prev) => prev.filter((c) => c.id !== columnId || c.fixed));
    try {
      await deleteKanbanColumnAction(columnId);
    } catch (err) {
      console.warn("Error al eliminar columna:", err);
    }
  }

  // ─── Card ops ───────────────────────────────────────────────────────────────
  async function handleAddCard(columnId: string, newCard: Omit<KanbanCardData, "id">) {
    try {
      // Guardar en BD y obtener el ID real
      const { id: dbId } = await createTareaAction({
        titulo: newCard.title,
        prioridad: newCard.priority,
        fecha: newCard.dueDate,
      });

      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId
            ? { ...col, cards: [...col.cards, { id: String(dbId), ...newCard }] }
            : col,
        ),
      );
    } catch (err) {
      console.warn("Error al crear tarea:", err);
    }
  }

  async function handleDeleteCard(columnId: string, cardId: string) {
    // Quitar de UI inmediatamente (optimista)
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          : col,
      ),
    );
    // Persistir si es un ID numérico (viene de la BD)
    const numId = parseInt(cardId, 10);
    if (!isNaN(numId)) {
      try {
        await deleteTareaAction(numId);
      } catch (err) {
        console.warn("Error al eliminar tarea:", err);
      }
    }
  }

  function handleCompleteCard(columnId: string, cardId: string) {
    // Buscar el título para mostrarlo en el modal
    const col = columns.find((c) => c.id === columnId);
    const card = col?.cards.find((c) => c.id === cardId);
    setResultadoText("");
    setResultadoModal({ columnId, cardId, titulo: card?.title ?? "Tarea" });
  }

  async function handleConfirmResultado() {
    if (!resultadoModal) return;
    const { columnId, cardId } = resultadoModal;
    const resultado = resultadoText.trim();
    setResultadoModal(null);

    // Mover la tarjeta a "completado" en la UI con el resultado
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const srcCol = next.find((c) => c.id === columnId);
      const dstCol = next.find((c) => c.id === "completado");
      if (!srcCol || !dstCol) return prev;
      const idx = srcCol.cards.findIndex((c) => c.id === cardId);
      if (idx === -1) return prev;
      const [moved] = srcCol.cards.splice(idx, 1);
      dstCol.cards.unshift({ ...moved, resultado: resultado || null });
      return next;
    });

    // Persistir en BD
    const numId = parseInt(cardId, 10);
    if (!isNaN(numId)) {
      try {
        await completeTareaAction(numId, resultado || undefined);
      } catch (err) {
        console.warn("Error al completar tarea:", err);
      }
    }
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-row gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              role={role}
              currentUserId={_currentUserId}
              onDeleteColumn={handleDeleteColumn}
              onAddCard={column.id === "completado" ? undefined : (colId) => setAddingCardCol(colId)}
              onDeleteCard={handleDeleteCard}
              onCompleteCard={column.id === "completado" ? undefined : handleCompleteCard}
            />
          ))}
          <KanbanAddColumn onAdd={handleAddColumn} />
        </div>
      </DragDropContext>

      {addingCardCol && (
        <KanbanAddCard
          role={role}
          agents={agents}
          onAdd={(card) => handleAddCard(addingCardCol, card)}
          onClose={() => setAddingCardCol(null)}
        />
      )}

      {/* Modal de resultado al completar tarea */}
      {resultadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">¿Cómo ha ido?</h2>
              <p className="mt-0.5 truncate text-sm text-text-secondary">{resultadoModal.titulo}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  Consecuencia / nota de lo realizado
                </label>
                <textarea
                  autoFocus
                  value={resultadoText}
                  onChange={(e) => setResultadoText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleConfirmResultado();
                    if (e.key === "Escape") setResultadoModal(null);
                  }}
                  placeholder="Ej: Llamada realizada, cliente interesado. Próxima visita el martes."
                  rows={4}
                  className="input w-full resize-none text-sm"
                />
                <p className="text-xs text-text-secondary">Opcional · Ctrl+Enter para confirmar</p>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setResultadoModal(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResultado}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  Marcar como realizada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
