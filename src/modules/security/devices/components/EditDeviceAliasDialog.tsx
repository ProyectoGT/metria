"use client";

import { useState } from "react";
import Drawer from "@/components/ui/drawer";

type Props = {
  open: boolean;
  initialAlias: string;
  onClose: () => void;
  onSave: (alias: string) => Promise<void>;
};

export default function EditDeviceAliasDialog({
  open,
  initialAlias,
  onClose,
  onSave,
}: Props) {
  const [alias, setAlias] = useState(initialAlias);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const value = alias.trim().replace(/\s+/g, " ");
    if (!value) {
      setError("El alias no puede estar vacio.");
      return;
    }
    if (value.length > 60) {
      setError("El alias no puede superar 60 caracteres.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el alias.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} width="sm" title="Editar alias">
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className="text-xs font-medium text-text-secondary">
            Alias del dispositivo
          </label>
          <input
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            className="input mt-1.5"
            maxLength={60}
            autoFocus
            placeholder="Mi portatil"
          />
          <p className="mt-1 text-[11px] text-text-secondary/70">
            Usa un nombre que te ayude a reconocerlo rapidamente.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !alias.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar alias"}
        </button>
      </div>
    </Drawer>
  );
}
