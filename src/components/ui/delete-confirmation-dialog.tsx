"use client";

// ─── DeleteConfirmationDialog ─────────────────────────────────────────────────
// Modal de confirmación destructiva con contraseña de seguridad.
// Refactorizado para usar los nuevos primitivos Button y Modal del design system.
// ─────────────────────────────────────────────────────────────────────────────

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import Button from "@/components/ui/button";

type DeleteConfirmationDialogProps = {
  title: string;
  description: string;
  password: string;
  error: string | null;
  pending: boolean;
  confirmLabel?: string;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirmationDialog({
  title,
  description,
  password,
  error,
  pending,
  confirmLabel = "Eliminar",
  onPasswordChange,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  return (
    <Modal open size="sm" onClose={onCancel}>
      <ModalHeader title={title} onClose={onCancel} />
      <ModalBody>
        <p className="text-sm text-text-secondary">{description}</p>

        <div className="mt-4">
          <label className="block text-xs font-medium text-text-secondary">
            Contraseña de confirmación
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Introduce la contraseña"
            className="input mt-1.5"
            autoFocus
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm} loading={pending}>
          {pending ? "Eliminando..." : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
