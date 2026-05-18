"use client";

import { Trash2, Copy, Check, History } from "lucide-react";
import { useLocalSimulations } from "../../hooks/use-local-simulations";
import { useCalculatorConfig } from "../../hooks/use-calculator-config";
import { TableContainer, Table, TableHead, TableBody, Tr, Th, Td } from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { useState } from "react";
import type { CalculatorType } from "../../types";
import { useToast, Toaster } from "@/components/ui/toast";

type Props = {
  searchQuery?: string;
  onOpenCalculator?: (id: CalculatorType) => void;
};

export default function SavedSimulationsTable({ searchQuery, onOpenCalculator }: Props) {
  const { simulations, remove } = useLocalSimulations();
  const { getById } = useCalculatorConfig();
  const { toasts, toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = searchQuery
    ? simulations.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.type.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : simulations;

  async function handleCopy(id: string, summary: string) {
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast("Resumen copiado");
    } catch {
      toast("No se pudo copiar", "error");
    }
  }

  function handleOpen(id: string) {
    const sim = simulations.find((s) => s.id === id);
    if (sim && onOpenCalculator) {
      onOpenCalculator(sim.type as CalculatorType);
    }
  }

  if (simulations.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-text-secondary" />
        <span className="text-sm font-semibold text-text-primary">
          Simulaciones guardadas ({simulations.length})
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-6 text-center">
          <p className="text-sm text-text-secondary">Ninguna simulación coincide con la búsqueda</p>
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <Tr>
                <Th>Tipo</Th>
                <Th>Título</Th>
                <Th>Fecha</Th>
                <Th align="right">Acciones</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {filtered.map((sim) => {
                const config = getById(sim.type as CalculatorType);
                return (
                  <Tr key={sim.id} onClick={() => handleOpen(sim.id)}>
                    <Td>
                      <div className="flex items-center gap-2">
                        {config && <Badge variant="primary" size="sm">{config.title}</Badge>}
                      </div>
                    </Td>
                    <Td className="max-w-[200px]">
                      <p className="truncate text-sm font-medium text-text-primary">{sim.title}</p>
                      <pre className="text-[11px] text-text-secondary truncate mt-0.5">{sim.summary.split("\n")[0]}</pre>
                    </Td>
                    <Td>
                      <span className="text-sm text-text-secondary">
                        {new Date(sim.savedAt).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleCopy(sim.id, sim.summary); }}
                          className="rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary"
                          title="Copiar resumen"
                        >
                          {copiedId === sim.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); remove(sim.id); }}
                          className="rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Toaster toasts={toasts} />
    </div>
  );
}
