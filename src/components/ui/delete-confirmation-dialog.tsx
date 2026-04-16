"use client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="mt-2 text-sm text-text-secondary">{description}</p>

        <div className="mt-4">
          <label className="text-xs font-medium text-text-secondary">
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

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
