"use client";

import type { InvestmentStatus, ViabilityStatus } from "../types";
import Badge from "@/components/ui/badge";

const VIABILITY_LABEL: Record<ViabilityStatus, string> = {
  viable: "Viable",
  tight: "Ajustada",
  not_viable: "No viable",
};

const INVESTMENT_LABEL: Record<InvestmentStatus, string> = {
  good: "Buena inversión",
  tight: "Ajustada",
  weak: "Débil",
};

export function ViabilityBadge({ status }: { status: ViabilityStatus }) {
  const variant = status === "viable" ? "success" : status === "tight" ? "warning" : "danger";
  return <Badge variant={variant} size="md">{VIABILITY_LABEL[status]}</Badge>;
}

export function InvestmentBadge({ status }: { status: InvestmentStatus }) {
  const variant = status === "good" ? "success" : status === "tight" ? "warning" : "danger";
  return <Badge variant={variant} size="md">{INVESTMENT_LABEL[status]}</Badge>;
}
