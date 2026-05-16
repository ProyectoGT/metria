import type { ElementType } from "react";

export type CalculatorType =
  | "simple_commission"
  | "purchase"
  | "mortgage"
  | "purchase_costs"
  | "plusvalia"
  | "seller_net"
  | "investment"
  | "max_budget"
  | "saved";

export type ViabilityStatus = "viable" | "tight" | "not_viable";
export type InvestmentStatus = "good" | "tight" | "weak";
export type PropertyKind = "new" | "used";
export type MortgageKind = "fixed" | "variable" | "mixed";
export type PaymentMode = "mortgage" | "cash" | "mixed";

export type CalculatorConfig = {
  id: CalculatorType;
  title: string;
  description: string;
  badge?: string;
  icon: ElementType;
};

export type CalculatorScreenProps = {
  onSummaryChange?: (summary: string) => void;
};

export type SimulationSummary = {
  title: string;
  body: string;
  tone?: ViabilityStatus | InvestmentStatus;
};

export type CalculatorSimulationType = Exclude<CalculatorType, "saved">;

export type CalculatorSimulation = {
  id: string;
  type: CalculatorSimulationType;
  title: string;
  relatedLeadId?: number | null;
  relatedPropertyId?: number | null;
  createdByUserId?: number | null;
  inputData: Record<string, unknown>;
  resultData: Record<string, unknown>;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type SimulationContext = {
  leadId?: number;
  propertyId?: number;
  budget?: number;
  propertyPrice?: number;
  zone?: string;
  propertyType?: string;
  modality?: string;
};
