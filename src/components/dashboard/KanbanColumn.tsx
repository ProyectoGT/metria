"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { CheckCircle2, Plus, X } from "lucide-react";
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
      className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Cabecera de columna ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <h3 className="truncate text-sm font-semibold text-text-primary">{column.title}</h3>
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
              {countLabel}
            </span>
            {activeCount === 0 && totalCount > 0 && (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-label="Todo completado" />
            )}
          </div>
        </div>
        {!column.fixed && (
          <button
            onClick={() => onDeleteColumn(column.id)}
            className={`rounded-lg p-1 text-text-secondary transition-all hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 ${hovered ? "opacity-100" : "opacity-0 focus-visible:opacity-100"}`}
            aria-label="Eliminar columna"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Área droppable — NO cambiar la estructura ─────────────── */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={[
              "flex max-h-[420px] min-h-[72px] flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3 transition-colors duration-150",
              snapshot.isDraggingOver ? "bg-primary/5 rounded-xl" : "",
            ].join(" ")}
          >
            {/* Empty state */}
            {column.cards.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-raised text-text-secondary/40">
                  <Plus className="h-5 w-5" />
                </div>
                <p className="text-xs text-text-secondary/50">
                  Sin tareas
                </p>
              </div>
            )}

            {column.cards.map((card: KanbanCardData, index: number) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  // div wrapper requerido por @hello-pangea/dnd — NO añadir clases aquí
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={dragProvided.draggableProps.style}
                  >
                    <KanbanCard
                      card={card}
                      canDelete={card.source === "tarea" && !card.assignedBy}
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

      {/* ── Botón añadir ─────────────────────────────────────────── */}
      {onAddCard && (
        <div className="border-t border-border px-3 py-2.5">
          <button
            onClick={() => onAddCard(column.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-text-secondary transition-all hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir
          </button>
        </div>
      )}
    </div>
  );
}
