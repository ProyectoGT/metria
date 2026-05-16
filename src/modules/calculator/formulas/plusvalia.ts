import { roundMoney, toSafeNumber } from "./number";

export type PlusvaliaInput = {
  purchaseDate?: string;
  saleDate?: string;
  landCadastralValue: number;
  purchasePrice: number;
  salePrice: number;
  municipalCoefficient?: number;
  landPercentage?: number;
  taxRate?: number;
  bonusPercent?: number;
};

export type PlusvaliaResult = {
  yearsHeld: number;
  objectiveEstimate: number;
  realEstimate: number;
  recommendedMethod: "objective" | "real";
  estimatedAmount: number;
  isValidDateRange: boolean;
};

const DEFAULT_COEFFICIENTS: Record<number, number> = {
  1: 0.14,
  2: 0.13,
  3: 0.12,
  4: 0.1,
  5: 0.09,
  6: 0.08,
  7: 0.08,
  8: 0.08,
  9: 0.08,
  10: 0.08,
  11: 0.08,
  12: 0.12,
  13: 0.16,
  14: 0.2,
  15: 0.26,
  16: 0.36,
  17: 0.46,
  18: 0.56,
  19: 0.65,
  20: 0.75,
};

function calculateYearsHeld(purchaseDate?: string, saleDate?: string): { years: number; valid: boolean } {
  if (!purchaseDate || !saleDate) return { years: 1, valid: true };
  const start = new Date(purchaseDate);
  const end = new Date(saleDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return { years: 0, valid: false };
  const diff = end.getTime() - start.getTime();
  return { years: Math.min(Math.max(Math.ceil(diff / (365.25 * 24 * 60 * 60 * 1000)), 1), 20), valid: true };
}

export function calculatePlusvaliaEstimate(input: PlusvaliaInput): PlusvaliaResult {
  const { years, valid } = calculateYearsHeld(input.purchaseDate, input.saleDate);
  const taxRate = Math.max(toSafeNumber(input.taxRate, 30), 0) / 100;
  const bonus = Math.min(Math.max(toSafeNumber(input.bonusPercent), 0), 100) / 100;
  const coefficient = Math.max(toSafeNumber(input.municipalCoefficient, DEFAULT_COEFFICIENTS[years] ?? 0.08), 0);
  const salePrice = Math.max(toSafeNumber(input.salePrice), 0);
  const purchasePrice = Math.max(toSafeNumber(input.purchasePrice), 0);
  const landValue = Math.max(toSafeNumber(input.landCadastralValue), 0) * Math.min(Math.max(toSafeNumber(input.landPercentage, 100), 0), 100) / 100;
  const gain = Math.max(salePrice - purchasePrice, 0);
  const landShare = salePrice > 0 ? landValue / salePrice : 0;

  const objectiveEstimate = roundMoney(landValue * coefficient * taxRate * (1 - bonus));
  const realEstimate = roundMoney(gain * landShare * taxRate * (1 - bonus));
  const recommendedMethod = realEstimate <= objectiveEstimate ? "real" : "objective";
  const estimatedAmount = valid ? Math.min(objectiveEstimate, realEstimate || objectiveEstimate) : 0;

  return {
    yearsHeld: years,
    objectiveEstimate,
    realEstimate,
    recommendedMethod,
    estimatedAmount: roundMoney(estimatedAmount),
    isValidDateRange: valid,
  };
}
