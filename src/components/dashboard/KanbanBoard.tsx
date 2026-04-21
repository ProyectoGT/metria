"use client";

import { useCallback, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import KanbanAddColumn from "./KanbanAddColumn";
import KanbanAddCard from "./KanbanAddCard";
import KanbanEditCard from "./KanbanEditCard";
import type { KanbanData, KanbanColumnData, KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";
import {
  createTareaAction,
  deleteTareaAction,
  completeTareaAction,
  updateTareaEstadoAction,
  updateTareaAction,
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
const COL_TO_ESTADO: Record<string, "pendiente" | "en_progreso"> = {
  pendientes: "pendiente",
  en_progreso: "en_progreso",
};

function isFutureDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split("T")[0];
  return dateStr.split("T")[0] > today;
}

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
  const [editingCard, setEditingCard] = useState<{ columnId: string; card: KanbanCardData } | null>(null);

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

    if (source.droppableId !== destination.droppableId) {
      const nuevoEstado = COL_TO_ESTADO[destination.droppableId];
      const numId = parseInt(draggableId, 10);
      if (nuevoEstado && !isNaN(numId)) {
        updateTareaEstadoAction(numId, nuevoEstado).catch(() => {});
      }
    }
  }

  // ─── Column ops ─────────────────────────────────────────────────────────────
  const handleAddColumn = useCallback(async (title: string) => {
    const id = `col-${Date.now()}`;
    setColumns((prev) => {
      const orden = prev.filter((c) => !c.fixed).length;
      addKanbanColumnAction({ col_id: id, titulo: title, orden }).catch(() => {});
      return [...prev, { id, title, fixed: false, cards: [] }];
    });
  }, []);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== columnId || c.fixed));
    deleteKanbanColumnAction(columnId).catch(() => {});
  }, []);

  // ─── Card ops ───────────────────────────────────────────────────────────────
  const handleAddCard = useCallback(async (columnId: string, newCard: Omit<KanbanCardData, "id">) => {
    // Si se añade en "Orden del día" con fecha futura → redirigir a "Pendientes"
    const future = isFutureDate(newCard.dueDate);
    const fromOrdenDia = columnId === "en_progreso" && future;
    const targetColId = fromOrdenDia ? "pendientes" : columnId;
    const estado = targetColId === "en_progreso" ? "en_progreso" : "pendiente";

    try {
      const { id: dbId } = await createTareaAction({
        titulo: newCard.title,
        prioridad: newCard.priority,
        fecha: newCard.dueDate,
        estado,
        fromOrdenDia,
      });
      const finalCard: KanbanCardData = {
        ...newCard,
        id: String(dbId),
        isCompleted: false,
        fromOrdenDia,
      };
      setColumns((prev) =>
        prev.map((col) =>
          col.id === targetColId
            ? { ...col, cards: [...col.cards, finalCard] }
            : col,
        ),
      );
    } catch {
      // fallo silencioso
    }
  }, []);

  const handleDeleteCard = useCallback(async (columnId: string, cardId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          : col,
      ),
    );
    const numId = parseInt(cardId, 10);
    if (!isNaN(numId)) {
      deleteTareaAction(numId).catch(() => {});
    }
  }, []);

  const handleOpenEdit = useCallback((columnId: string, card: KanbanCardData) => {
    setEditingCard({ columnId, card });
  }, []);

  const handleSaveEdit = useCallback((updates: { title: string; priority: KanbanPriority; dueDate?: string }) => {
    if (!editingCard) return;
    const { columnId, card } = editingCard;
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.map((c) => c.id === card.id ? { ...c, ...updates } : c) }
          : col,
      ),
    );
    const numId = parseInt(card.id, 10);
    if (!isNaN(numId)) {
      updateTareaAction(numId, { titulo: updates.title, prioridad: updates.priority, fecha: updates.dueDate || null }).catch(() => {});
    }
  }, [editingCard]);

  const handleCompleteCard = useCallback((columnId: string, cardId: string, card: KanbanCardData) => {

    const needsResultado = card.fromOrdenDia || columnId === "en_progreso";

    if (needsResultado) {
      setResultadoText("");
      setResultadoModal({ columnId, cardId, titulo: card.title });
    } else {
      // Completar en sitio sin modal
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId
            ? { ...col, cards: col.cards.map((c) => c.id === cardId ? { ...c, isCompleted: true } : c) }
            : col,
        ),
      );
      const numId = parseInt(cardId, 10);
      if (!isNaN(numId)) {
        completeTareaAction(numId).catch(() => {});
      }
    }
  }, []);

  const handleConfirmResultado = useCallback(async () => {
    if (!resultadoModal) return;
    const { columnId, cardId } = resultadoModal;
    const resultado = resultadoText.trim();
    setResultadoModal(null);

    // Marcar en su columna actual como completada (sin mover)
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? {
              ...col,
              cards: col.cards.map((c) =>
                c.id === cardId ? { ...c, isCompleted: true, resultado: resultado || null } : c
              ),
            }
          : col,
      ),
    );

    const numId = parseInt(cardId, 10);
    if (!isNaN(numId)) {
      completeTareaAction(numId, resultado || undefined).catch(() => {});
    }
  }, [resultadoModal, resultadoText]);

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
              onAddCard={(colId) => setAddingCardCol(colId)}
              onDeleteCard={handleDeleteCard}
              onEditCard={handleOpenEdit}
              onCompleteCard={handleCompleteCard}
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

      {editingCard && (
        <KanbanEditCard
          card={editingCard.card}
          onSave={(updates: { title: string; priority: KanbanPriority; dueDate?: string }) => { handleSaveEdit(updates); setEditingCard(null); }}
          onClose={() => setEditingCard(null)}
        />
      )}

      {/* Modal de resultado al completar tarea de Orden del día */}
      {resultadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">¿Como ha ido?</h2>
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
                  placeholder="Ej: Llamada realizada, cliente interesado. Proxima visita el martes."
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
