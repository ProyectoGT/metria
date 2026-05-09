"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Droppable } from "@hello-pangea/dnd";
import { CheckCircle2, Plus, X } from "lucide-react";
import KanbanDraggableCard from "./KanbanDraggableCard";
import type { KanbanColumnData, KanbanCardData } from "@/lib/mock/dashboard";

type KanbanColumnProps = {
  column:          KanbanColumnData;
  onDeleteColumn:  (columnId: string) => void;
  onAddCard?:      (columnId: string) => void;
  onCompleteCard?: (columnId: string, cardId: string, card: KanbanCardData) => void;
  onDetailCard:    (columnId: string, card: KanbanCardData) => void;
};

function KanbanColumn({
  column,
  onDeleteColumn,
  onAddCard,
  onCompleteCard,
  onDetailCard,
}: KanbanColumnProps) {
  const [hovered, setHovered] = useState(false);

  const activeCount = useMemo(() => column.cards.filter((c) => !c.isCompleted).length, [column.cards]);
  const totalCount  = column.cards.length;
  const countLabel  = activeCount === totalCount ? String(activeCount) : `${activeCount}/${totalCount}`;

  // Stable callbacks — created once per column mount so KanbanDraggableCard's
  // useCallback dependencies remain stable across parent re-renders.
  const handleDelete = useCallback(() => {
    onDeleteColumn(column.id);
  }, [column.id, onDeleteColumn]);

  const handleAddCard = useCallback(() => {
    onAddCard?.(column.id);
  }, [column.id, onAddCard]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex w-[calc((100cqi-3rem)/4)] min-w-[260px] shrink-0 flex-col overflow-hidden rounded-ds-lg border border-border bg-surface shadow-layer-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Cabecera (sticky) ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface-elevated px-4 py-3.5 shadow-layer-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <h3 className="truncate text-sm font-semibold text-text-primary">{column.title}</h3>
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
              {countLabel}
            </span>
            {activeCount === 0 && totalCount > 0 && (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-label="Todo completado" />
            )}
          </div>
        </div>
        {!column.fixed && (
          <button
            onClick={handleDelete}
            className={`rounded-lg p-1 text-text-secondary transition-all hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 ${hovered ? "opacity-100" : "opacity-0 focus-visible:opacity-100"}`}
            aria-label="Eliminar columna"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Área droppable ───────────────────────────────────────── */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={[
              "flex min-h-[72px] flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 transition-colors duration-150",
              "scrollbar-thin max-h-[420px]",
              snapshot.isDraggingOver ? "bg-primary/5" : "",
            ].join(" ")}
          >
            {column.cards.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-text-secondary/40">
                  <Plus className="h-5 w-5" />
                </div>
                <p className="text-xs text-text-secondary/50">Sin tareas</p>
              </div>
            )}

            {column.cards.map((card: KanbanCardData, index: number) => (
              // KanbanDraggableCard is memoized and creates stable callbacks internally,
              // so KanbanCard only re-renders when its own `card` data changes.
              <KanbanDraggableCard
                key={card.id}
                card={card}
                index={index}
                columnId={column.id}
                onDetail={onDetailCard}
                onComplete={onCompleteCard}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* ── Botón añadir ─────────────────────────────────────────── */}
      {onAddCard && (
        <div className="border-t border-border px-3 py-2.5">
          <button
            onClick={handleAddCard}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-text-secondary transition-all hover:bg-state-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus"
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default memo(KanbanColumn);
