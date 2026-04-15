"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, X } from "lucide-react";
import KanbanCard from "./KanbanCard";
import type { KanbanColumnData, KanbanCardData } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";

type KanbanColumnProps = {
  column: KanbanColumnData;
  role: UserRole;
  currentUserId: string;
  onDeleteColumn: (columnId: string) => void;
  onAddCard?: (columnId: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onCompleteCard?: (columnId: string, cardId: string) => void;
};

export default function KanbanColumn({
  column,
  onDeleteColumn,
  onAddCard,
  onDeleteCard,
  onCompleteCard,
}: KanbanColumnProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex w-[280px] shrink-0 flex-col rounded-xl bg-surface shadow-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">{column.title}</h3>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-text-secondary">
            {column.cards.length}
          </span>
        </div>
        {!column.fixed && (
          <button
            onClick={() => onDeleteColumn(column.id)}
            className={`rounded p-1 text-text-secondary transition-all hover:bg-red-50 hover:text-danger ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Eliminar columna"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Cards (droppable area) */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex max-h-[480px] min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto p-3 transition-colors ${
              snapshot.isDraggingOver ? "bg-blue-50/50" : ""
            }`}
          >
            {column.cards.map((card: KanbanCardData, index: number) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={dragProvided.draggableProps.style}
                  >
                    <KanbanCard
                      card={card}
                      canDelete={!card.assignedBy}
                      onDelete={(id) => onDeleteCard(column.id, id)}
                      onComplete={(id) => onCompleteCard(column.id, id)}
                      dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Footer: add card (oculto en columna Realizado) */}
      {onAddCard && (
        <div className="border-t border-border p-2">
          <button
            onClick={() => onAddCard(column.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Añadir tarea
          </button>
        </div>
      )}
    </div>
  );
}
