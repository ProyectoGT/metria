"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import Button from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pending = false,
  danger = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} size="sm" onClose={onCancel}>
      <ModalHeader title={title} onClose={onCancel} />
      <ModalBody>
        <p className="text-sm text-text-secondary">{description}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? "danger" : "primary"} size="sm" onClick={onConfirm} loading={pending}>
          {pending ? "Guardando..." : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
