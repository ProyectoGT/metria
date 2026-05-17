"use client";

import { useState } from "react";
import {
  Check,
  CheckSquare,
  Clock,
  Copy,
  History,
  MessageCircle,
  Save,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Toaster, useToast } from "@/components/ui/toast";
import { tareasService } from "@/modules/tareas/services/tareas.service";
import { useLocalSimulations } from "../hooks/use-local-simulations";
import type { CalculatorType } from "../types";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  summary: string;
  calculatorType?: CalculatorType;
  calculatorTitle?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCopyText(summary: string): string {
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `Simulacion inmobiliaria — ${date}\n${"─".repeat(44)}\n\n${summary}\n\n${"─".repeat(44)}\nGenerado con Metria CRM`;
}

function buildWhatsAppText(summary: string): string {
  const lines = summary.split("\n").filter(Boolean);
  const [title, ...rest] = lines;
  const body = rest.map((line) => `• ${line}`).join("\n");
  return `Hola 👋\n\nTe comparto el resumen de la simulacion:\n\n*${title ?? "Simulacion inmobiliaria"}*\n\n${body}\n\nSi quieres revisar mas opciones o ajustar escenarios, avisame.`;
}

function hasUsableResults(summary: string): boolean {
  return (
    summary.trim().length > 0 &&
    !summary.startsWith("Selecciona") &&
    !summary.startsWith("Completa")
  );
}

// ─── WhatsApp Modal ───────────────────────────────────────────────────────────

function WhatsAppModal({
  open,
  onClose,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  summary: string;
}) {
  const [phone, setPhone] = useState("");
  const message = buildWhatsAppText(summary);

  function handleOpen() {
    const encoded = encodeURIComponent(message);
    const url = phone.trim()
      ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader
        title="Compartir por WhatsApp"
        subtitle="Genera un mensaje comercial listo para enviar"
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Telefono del cliente{" "}
              <span className="font-normal text-text-secondary">(opcional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
              className="input"
            />
            <p className="mt-1 text-xs text-text-secondary">
              Si lo dejas en blanco, se abrira WhatsApp sin destinatario predefinido.
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">Vista previa del mensaje</p>
            <div className="rounded-ds-md border border-border bg-surface-muted p-4">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
                {message}
              </pre>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={<MessageCircle className="h-4 w-4" />}
          onClick={handleOpen}
        >
          Abrir WhatsApp
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  {
    value: "alta" as const,
    label: "Alta",
    active: "border-danger bg-danger/10 text-danger",
    base: "border-border text-text-secondary hover:bg-state-hover",
  },
  {
    value: "media" as const,
    label: "Media",
    active: "border-warning bg-warning/10 text-warning",
    base: "border-border text-text-secondary hover:bg-state-hover",
  },
  {
    value: "baja" as const,
    label: "Baja",
    active: "border-success bg-success/10 text-success",
    base: "border-border text-text-secondary hover:bg-state-hover",
  },
];

type Priority = (typeof PRIORITY_OPTIONS)[number]["value"];

function TaskModal({
  open,
  onClose,
  defaultTitle,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  defaultTitle: string;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [priority, setPriority] = useState<Priority>("media");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("El titulo es obligatorio");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await tareasService.create({ titulo: title.trim(), prioridad: priority });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la tarea");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader
        title="Crear tarea"
        subtitle="Crea un seguimiento a partir de esta simulacion"
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Titulo <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">Prioridad</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={[
                    "flex-1 rounded-ds-md border py-2 text-sm font-medium transition-colors",
                    priority === opt.value ? opt.active : opt.base,
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="rounded-ds-md bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={<CheckSquare className="h-4 w-4" />}
          onClick={handleSubmit}
          loading={loading}
        >
          Crear tarea
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── History Modal ────────────────────────────────────────────────────────────

function HistoryModal({
  open,
  onClose,
  simulations,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  simulations: ReturnType<typeof useLocalSimulations>["simulations"];
  onDelete: (id: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(id: string, summary: string) {
    try {
      await navigator.clipboard.writeText(buildCopyText(summary));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader
        title="Historial de simulaciones"
        subtitle={`${simulations.length} simulacion${simulations.length !== 1 ? "es" : ""} guardada${simulations.length !== 1 ? "s" : ""} en este dispositivo`}
        onClose={onClose}
      />
      <ModalBody noPadding>
        {simulations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Clock className="h-8 w-8 text-text-secondary/40" />
            <p className="text-sm font-semibold text-text-secondary">Sin simulaciones guardadas</p>
            <p className="text-xs text-text-secondary/70">
              Guarda una simulacion para verla aqui.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {simulations.map((sim) => (
              <li
                key={sim.id}
                className="group flex items-start gap-3 px-5 py-4 hover:bg-state-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{sim.title}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {new Date(sim.savedAt).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    } as Intl.DateTimeFormatOptions)}
                  </p>
                  <pre className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-text-secondary/80">
                    {sim.summary.split("\n").slice(1, 4).join("\n")}
                  </pre>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleCopy(sim.id, sim.summary)}
                    className="rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
                    title="Copiar resumen"
                  >
                    {copiedId === sim.id ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(sim.id)}
                    className="rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── ActionChip ───────────────────────────────────────────────────────────────

type ChipVariant = "default" | "active" | "success" | "subtle";

function ActionChip({
  icon,
  label,
  onClick,
  disabled,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ChipVariant;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-ds-md border px-3 py-2 text-xs font-medium transition-all select-none";

  const variantCls: Record<ChipVariant, string> = {
    default:
      "border-border bg-surface-elevated text-text-primary shadow-layer-1 hover:border-border-strong hover:bg-state-hover hover:shadow-layer-2 cursor-pointer",
    active: "border-success/40 bg-success/10 text-success cursor-pointer",
    success: "border-success/40 bg-success/10 text-success cursor-pointer",
    subtle:
      "border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-state-hover hover:text-text-primary cursor-pointer",
  };

  const disabledCls = "border-border bg-surface text-text-secondary/40 opacity-50 cursor-not-allowed";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[base, disabled ? disabledCls : variantCls[variant]].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type OpenModal = "whatsapp" | "task" | "history" | null;

export default function CalculatorActions({ summary, calculatorType, calculatorTitle }: Props) {
  const { toasts, toast } = useToast();
  const { simulations, save, remove } = useLocalSimulations();

  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const [taskKey, setTaskKey] = useState(0);

  const active = hasUsableResults(summary);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildCopyText(summary));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast("Resumen copiado al portapapeles");
    } catch {
      toast("No se pudo copiar el resumen", "error");
    }
  }

  function handleSave() {
    const date = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const title = `${calculatorTitle ?? "Simulacion"} — ${date}`;
    save({ type: calculatorType ?? "simple_commission", title, summary });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
    toast("Simulacion guardada en el historial");
  }

  function handleDuplicate() {
    const date = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const time = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const title = `${calculatorTitle ?? "Simulacion"} (copia) — ${date} ${time}`;
    save({ type: calculatorType ?? "simple_commission", title, summary });
    toast("Copia guardada en el historial");
  }

  function openTaskModal() {
    setTaskKey((k) => k + 1);
    setOpenModal("task");
  }

  const defaultTaskTitle = `Seguimiento — ${calculatorTitle ?? "simulacion inmobiliaria"}`;

  return (
    <>
      <div className="overflow-hidden rounded-ds-lg border border-border bg-surface shadow-layer-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-ds-sm bg-primary/10">
              <span className="text-[10px] font-bold leading-none text-primary">AC</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">Acciones comerciales</span>
          </div>
          {simulations.length > 0 && (
            <button
              type="button"
              onClick={() => setOpenModal("history")}
              className="flex items-center gap-1.5 rounded-ds-sm px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary"
            >
              <History className="h-3.5 w-3.5" />
              {simulations.length} guardada{simulations.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {/* Primary group */}
            <ActionChip
              icon={
                copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )
              }
              label={copied ? "Copiado" : "Copiar resumen"}
              onClick={handleCopy}
              disabled={!active}
              variant={copied ? "active" : "default"}
            />
            <ActionChip
              icon={<MessageCircle className="h-3.5 w-3.5" />}
              label="WhatsApp"
              onClick={() => setOpenModal("whatsapp")}
              disabled={!active}
            />
            <ActionChip
              icon={<CheckSquare className="h-3.5 w-3.5" />}
              label="Crear tarea"
              onClick={openTaskModal}
              disabled={!active}
            />

            {/* Separator */}
            <div className="hidden w-px bg-border sm:block" />

            {/* Secondary group */}
            <ActionChip
              icon={
                savedFeedback ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )
              }
              label={savedFeedback ? "Guardado" : "Guardar"}
              onClick={handleSave}
              disabled={!active}
              variant={savedFeedback ? "success" : "subtle"}
            />
            <ActionChip
              icon={<Copy className="h-3.5 w-3.5" />}
              label="Duplicar"
              onClick={handleDuplicate}
              disabled={!active}
              variant="subtle"
            />
            <ActionChip
              icon={<History className="h-3.5 w-3.5" />}
              label={simulations.length > 0 ? `Historial (${simulations.length})` : "Historial"}
              onClick={() => setOpenModal("history")}
              variant="subtle"
            />
          </div>

          {!active && (
            <p className="mt-3 text-xs text-text-secondary">
              Completa la simulacion para activar las acciones comerciales.
            </p>
          )}
        </div>
      </div>

      <WhatsAppModal
        open={openModal === "whatsapp"}
        onClose={() => setOpenModal(null)}
        summary={summary}
      />
      <TaskModal
        key={taskKey}
        open={openModal === "task"}
        onClose={() => setOpenModal(null)}
        defaultTitle={defaultTaskTitle}
        onSuccess={() => toast("Tarea creada correctamente")}
      />
      <HistoryModal
        open={openModal === "history"}
        onClose={() => setOpenModal(null)}
        simulations={simulations}
        onDelete={remove}
      />

      <Toaster toasts={toasts} />
    </>
  );
}
