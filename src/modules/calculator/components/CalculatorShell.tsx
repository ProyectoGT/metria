"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
      <div className="rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={onBack}
          >
            Volver a calculadoras
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          </div>
        </div>
      </div>
      {children}
      <CalculatorActions
        summary={summary}
        calculatorType={calculatorType}
        calculatorTitle={title}
      />
    </div>
  );
}
