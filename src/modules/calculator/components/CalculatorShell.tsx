"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import CalculatorActions from "./CalculatorActions";
import type { CalculatorType } from "../types";

type CalculatorShellProps = {
  title: string;
  description: string;
  onBack: () => void;
  summary: string;
  calculatorType?: CalculatorType;
  children: ReactNode;
};

export default function CalculatorShell({
  title,
  description,
  onBack,
  summary,
  calculatorType,
  children,
}: CalculatorShellProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb sutil */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none"
          aria-label="Volver a la lista de calculadoras"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Calculadoras
        </button>
        <ChevronRight className="h-3 w-3 text-border-strong" />
        <span className="text-xs font-medium text-text-primary">{title}</span>
      </div>

      {description && (
        <p className="-mt-2 text-sm text-text-secondary">{description}</p>
      )}

      {children}

      <CalculatorActions
        summary={summary}
        calculatorType={calculatorType}
        calculatorTitle={title}
      />
    </div>
  );
}
