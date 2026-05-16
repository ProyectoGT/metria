"use client";

import type { ReactNode } from "react";
import { CheckSquare, Copy, FileText, Link2, MessageCircle, Save } from "lucide-react";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";

type CalculatorActionsProps = {
  summary: string;
  onCopied: () => void;
  onCopyError: () => void;
};

const UPCOMING_TITLE = "Próximamente";

export default function CalculatorActions({ summary, onCopied, onCopyError }: CalculatorActionsProps) {
  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      onCopied();
    } catch {
      onCopyError();
    }
  }

  return (
    <div className="rounded-ds-lg border border-border bg-surface p-4 shadow-layer-1">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Acciones comerciales</h3>
          <p className="mt-1 text-xs text-text-secondary">Copia el resumen ahora. El resto de acciones quedan marcadas como próximas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={copySummary}>Copiar resumen</Button>
          <UpcomingButton icon={<Save className="h-4 w-4" />} label="Guardar" />
          <UpcomingButton icon={<Copy className="h-4 w-4" />} label="Duplicar" />
          <UpcomingButton icon={<Link2 className="h-4 w-4" />} label="Vincular" />
          <UpcomingButton icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" />
          <UpcomingButton icon={<FileText className="h-4 w-4" />} label="PDF" />
          <UpcomingButton icon={<CheckSquare className="h-4 w-4" />} label="Crear tarea" />
        </div>
      </div>
    </div>
  );
}

function UpcomingButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={UPCOMING_TITLE}>
      <Button size="sm" variant="ghost" icon={icon} disabled>{label}</Button>
      <Badge variant="muted">Próx.</Badge>
    </span>
  );
}
