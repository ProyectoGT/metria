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
  onEditCard: (columnId: string, card: KanbanCardData) => void;
  onCompleteCard?: (columnId: string, cardId: string, card: KanbanCardData) => void;
};

export default function KanbanColumn({
  column,
  onDeleteColumn,
  onAddCard,
  onDeleteCard,
  onEditCard,
  onCompleteCard,
}: KanbanColumnProps) {
  const [hovered, setHovered] = useState(false);

  const activeCount = column.cards.filter((c) => !c.isCompleted).length;
  const totalCount = column.cards.length;
  const countLabel = activeCount === totalCount ? String(activeCount) : `${activeCount}/${totalCount}`;

  return (
    <div
      className="flex w-[280px] shrink-0 flex-col rounded-xl bg-surface shadow-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">{column.title}</h3>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-text-secondary">
            {countLabel}
          </span>
        </div>
        {!column.fixed && (
          <button
            onClick={() => onDeleteColumn(column.id)}
            className={`rounded p-1 text-text-secondary transition-all hover:bg-danger/10 hover:text-danger ${hovered ? "opacity-100" : "opacity-0"}`}
            aria-label="Eliminar columna"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex max-h-[480px] min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto p-3 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5" : ""
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
                      isCompleted={card.isCompleted ?? false}
                      onDelete={(id) => onDeleteCard(column.id, id)}
                      onEdit={(id) => { const c = column.cards.find((x) => x.id === id); if (c) onEditCard(column.id, c); }}
                      onComplete={onCompleteCard ? (id) => onCompleteCard(column.id, id, card) : undefined}
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
