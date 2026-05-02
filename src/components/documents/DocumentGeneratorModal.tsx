"use client";

import { useState } from "react";
import { FileText, Loader2, X, Printer } from "lucide-react";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/document-templates";
import { generateDocumentAction, type GenerateDocumentInput } from "@/app/(crm)/documents/generate-action";

type Subject =
  | { type: "propiedad"; id: number; label: string }
  | { type: "pedido"; id: number; label: string };

type Props = {
  subject: Subject;
  onClose: () => void;
};

// Plantillas disponibles según tipo de entidad
const PROP_TYPES: DocumentType[] = ["ficha_propiedad", "encargo_venta", "encargo_alquiler"];
const PEDIDO_TYPES: DocumentType[] = ["resumen_pedido"];

export default function DocumentGeneratorModal({ subject, onClose }: Props) {
  const available = DOCUMENT_TYPES.filter((d) =>
    subject.type === "propiedad" ? PROP_TYPES.includes(d.value) : PEDIDO_TYPES.includes(d.value)
  );

  const [selected, setSelected] = useState<DocumentType>(available[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    let input: GenerateDocumentInput;
    if (subject.type === "propiedad") {
      input = { tipo: selected as "ficha_propiedad" | "encargo_venta" | "encargo_alquiler", propiedadId: subject.id };
    } else {
      input = { tipo: "resumen_pedido", pedidoId: subject.id };
    }

    const result = await generateDocumentAction(input);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Abrir en nueva ventana — el script del HTML llama a window.print() automáticamente
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(result.html);
      win.document.close();
    } else {
      // Fallback si popups bloqueados: descargar como blob
      const blob = new Blob([result.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documento-${subject.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <FileText className="h-4 w-4 text-primary" />
              Generar documento
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">{subject.label}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selección de plantilla */}
        <div className="space-y-2 px-6 py-5">
          <p className="mb-3 text-xs font-medium text-text-secondary">Selecciona la plantilla:</p>

          {available.map((doc) => (
            <button
              key={doc.value}
              type="button"
              onClick={() => setSelected(doc.value)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                selected === doc.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-background"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  selected === doc.value ? "border-primary bg-primary" : "border-border"
                }`}>
                  {selected === doc.value && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{doc.label}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{doc.description}</p>
                </div>
              </div>
            </button>
          ))}

          {error && (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}

          <p className="mt-3 text-[11px] text-text-secondary">
            El documento se abrira en una nueva pestana listo para imprimir o guardar como PDF.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {loading ? "Generando..." : "Generar e imprimir"}
          </button>
        </div>
      </div>
    </div>
  );
}
