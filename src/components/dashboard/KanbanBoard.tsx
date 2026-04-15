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
} from "@/app/(crm)/dashboard/actions";

type KanbanBoardProps = {
  initialData: KanbanData;
  role: UserRole;
  currentUserId: string;
  agents?: Array<{ id: string; nombre: string }>;
};

export default function KanbanBoard({
  initialData,
  role,
  currentUserId: _currentUserId,
  agents = [],
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnData[]>(initialData.columns);
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);

  // ─── Drag & drop ────────────────────────────────────────────────────────────
  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
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
  }

  // ─── Column ops ─────────────────────────────────────────────────────────────
  function handleAddColumn(title: string) {
    const id = `col-${Date.now()}`;
    setColumns((prev) => [...prev, { id, title, fixed: false, cards: [] }]);
  }

  function handleDeleteColumn(columnId: string) {
    setColumns((prev) => prev.filter((c) => c.id !== columnId || c.fixed));
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
      console.error("Error al crear tarea:", err);
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
        console.error("Error al eliminar tarea:", err);
      }
    }
  }

  async function handleCompleteCard(columnId: string, cardId: string) {
    // Quitar de UI (el componente KanbanCard ya muestra el tachado antes de llamar aquí)
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          : col,
      ),
    );
    // Persistir en BD
    const numId = parseInt(cardId, 10);
    if (!isNaN(numId)) {
      try {
        await completeTareaAction(numId);
      } catch (err) {
        console.error("Error al completar tarea:", err);
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
              onAddCard={(colId) => setAddingCardCol(colId)}
              onDeleteCard={handleDeleteCard}
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
    </>
  );
}
