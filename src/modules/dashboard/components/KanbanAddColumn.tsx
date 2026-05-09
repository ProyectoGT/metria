"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";

type KanbanAddColumnProps = {
  onAdd: (title: string) => void;
};

export default function KanbanAddColumn({ onAdd }: KanbanAddColumnProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleConfirm() {
    const trimmed = title.trim();
    if (!trimmed) {
      setEditing(false);
      setTitle("");
      return;
    }
    onAdd(trimmed);
    setTitle("");
    setEditing(false);
  }

  function handleCancel() {
    setTitle("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex h-12 w-[280px] shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-transparent text-sm font-medium text-text-secondary transition-colors hover:border-primary hover:bg-surface hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Añadir columna
      </button>
    );
  }

  return (
    <div className="flex w-[280px] shrink-0 items-center gap-2 rounded-xl bg-surface p-3 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleConfirm();
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="Nombre de la columna"
        className="input flex-1"
      />
      <button
        onClick={handleConfirm}
        className="rounded-lg bg-primary p-1.5 text-white transition-colors hover:bg-primary-dark"
        aria-label="Confirmar"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={handleCancel}
        className="rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:bg-background"
        aria-label="Cancelar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
