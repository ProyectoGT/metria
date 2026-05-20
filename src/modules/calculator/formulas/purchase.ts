import type { PaymentMode, PropertyKind, ViabilityStatus } from "../types";
import { roundMoney, toSafeNumber } from "./number";
import { calculateMortgagePayment, calculateDebtRatio, getViabilityByDebtRatio } from "./mortgage";
import { calculatePurchaseCosts } from "./purchaseCosts";

export type PurchaseInput = {
  price: number;
  savings: number;
  propertyKind: PropertyKind;
  autonomousCommunity?: string;
  financingPercent: number;
  annualInterestRate: number;
  years: number;
  monthlyIncome: number;
  monthlyDebt?: number;
  paymentMode: PaymentMode;
  firstHome?: boolean;
  buyerAge?: number;
};

export type PurchaseResult = {
  requiredDownPayment: number;
  purchaseCosts: number;
  mortgagePrincipal: number;
  monthlyPayment: number;
  debtRatio: number;
  totalNeeded: number;
  remainingSavings: number;
  maxRecommendedPrice: number;
  viability: ViabilityStatus;
  summary: string;
};

export function calculateRequiredSavings(price: number, financingPercent: number, purchaseCosts: number): number {
  const financing = Math.min(Math.max(toSafeNumber(financingPercent), 0), 100);
  return roundMoney(Math.max(toSafeNumber(price), 0) * ((100 - financing) / 100) + Math.max(toSafeNumber(purchaseCosts), 0));
}

export function calculateViability(params: { savings: number; totalNeeded: number; debtRatio: number; paymentMode: PaymentMode; price: number; monthlyIncome: number }): ViabilityStatus {
  if (params.price <= 0) return "not_viable";
  const savingsOk = params.savings >= params.totalNeeded;
  if (params.paymentMode === "cash") return savingsOk ? "viable" : "not_viable";
  if (params.monthlyIncome <= 0) return "not_viable";
  const debtStatus = getViabilityByDebtRatio(params.debtRatio);
  if (!savingsOk) return debtStatus === "viable" ? "tight" : "not_viable";
  return debtStatus;
}

export function calculatePurchaseSimulation(input: PurchaseInput): PurchaseResult {
  const price = Math.max(toSafeNumber(input.price), 0);
  const savings = Math.max(toSafeNumber(input.savings), 0);
  const monthlyIncome = Math.max(toSafeNumber(input.monthlyIncome), 0);
  const monthlyDebt = Math.max(toSafeNumber(input.monthlyDebt), 0);
  const years = Math.max(toSafeNumber(input.years), 0);
  const annualInterestRate = Math.max(toSafeNumber(input.annualInterestRate), 0);
  const financingPercent = input.paymentMode === "cash" ? 0 : Math.min(Math.max(toSafeNumber(input.financingPercent), 0), 100);
  const mortgagePrincipal = roundMoney(price * (financingPercent / 100));
  const requiredDownPayment = roundMoney(price - mortgagePrincipal);
  const costs = calculatePurchaseCosts({
    price,
    propertyKind: input.propertyKind,
    autonomousCommunity: input.autonomousCommunity,
    hasMortgage: input.paymentMode !== "cash",
    firstHome: input.firstHome,
    buyerAge: input.buyerAge,
  });
  const totalNeeded = roundMoney(requiredDownPayment + costs.totalCosts);
  const monthlyPayment =
    input.paymentMode === "cash" ? 0 : calculateMortgagePayment(mortgagePrincipal, annualInterestRate, years);
  const debtRatio = calculateDebtRatio(monthlyPayment, monthlyIncome, monthlyDebt);
  const viability = calculateViability({ savings, totalNeeded, debtRatio, paymentMode: input.paymentMode, price, monthlyIncome });

  const maxMonthlyPayment = Math.max(monthlyIncome * 0.35 - monthlyDebt, 0);
  const maxBySavings = financingPercent < 100 ? savings / ((100 - financingPercent) / 100 + 0.11) : savings / 0.11;
  const maxByIncome = maxMonthlyPayment * years * 12;
  const maxRecommendedPrice = roundMoney(Math.max(input.paymentMode === "cash" ? maxBySavings : Math.min(maxBySavings, maxByIncome), 0));

  return {
    requiredDownPayment,
    purchaseCosts: costs.totalCosts,
    mortgagePrincipal,
    monthlyPayment,
    debtRatio,
    totalNeeded,
    remainingSavings: roundMoney(savings - totalNeeded),
    maxRecommendedPrice,
    viability,
    summary: `El comprador puede afrontar esta operación con una cuota aproximada de ${roundMoney(monthlyPayment)} €/mes y necesita disponer de ${roundMoney(totalNeeded)} € entre entrada y gastos.`,
  };
}

export function calculatePurchaseViability(input: PurchaseInput): PurchaseResult {
  return calculatePurchaseSimulation(input);
}

export function calculateHomePurchase(input: PurchaseInput): PurchaseResult {
  return calculatePurchaseSimulation(input);
}
