"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { translateVisibleText } from "@/lib/i18n/translate-text";

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
  const { t } = useI18n();

  return (
    <Modal open={open} size="sm" onClose={onCancel}>
      <ModalHeader title={translateVisibleText(title)} onClose={onCancel} />
      <ModalBody>
        <p className="text-sm text-text-secondary">{translateVisibleText(description)}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
          {translateVisibleText(cancelLabel)}
        </Button>
        <Button variant={danger ? "danger" : "primary"} size="sm" onClick={onConfirm} loading={pending}>
          {pending ? t("common:loading") : translateVisibleText(confirmLabel)}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
