import type { PropertyKind } from "../types";
import { roundMoney, toSafeNumber } from "./number";
import { calculateMortgagePayment } from "./mortgage";
import { calculatePurchaseCosts } from "./purchaseCosts";

export type MaxBudgetInput = {
  savings: number;
  monthlyIncome: number;
  monthlyDebt?: number;
  comfortableMonthlyPayment?: number;
  years: number;
  annualInterestRate: number;
  financingPercent: number;
  autonomousCommunity?: string;
  propertyKind: PropertyKind;
};

export type MaxBudgetResult = {
  maxRecommendedPrice: number;
  maxMortgagePrincipal: number;
  requiredDownPayment: number;
  estimatedCosts: number;
  safeSearchMin: number;
  safeSearchMax: number;
  recommendedLeadBudget: number;
};

function principalFromPayment(monthlyPayment: number, annualInterestRate: number, years: number): number {
  monthlyPayment = Math.max(toSafeNumber(monthlyPayment), 0);
  annualInterestRate = Math.max(toSafeNumber(annualInterestRate), 0);
  years = Math.max(toSafeNumber(years), 0);
  if (monthlyPayment <= 0 || years <= 0) return 0;
  const months = years * 12;
  const rate = annualInterestRate / 100 / 12;
  if (rate <= 0) return monthlyPayment * months;
  const factor = Math.pow(1 + rate, months);
  return monthlyPayment * ((factor - 1) / (rate * factor));
}

export function calculateMaxPurchasePrice(input: MaxBudgetInput): MaxBudgetResult {
  const financingPercent = Math.min(Math.max(toSafeNumber(input.financingPercent, 1), 1), 100);
  const savings = Math.max(toSafeNumber(input.savings), 0);
  const monthlyIncome = Math.max(toSafeNumber(input.monthlyIncome), 0);
  const monthlyDebt = Math.max(toSafeNumber(input.monthlyDebt), 0);
  const years = Math.max(toSafeNumber(input.years), 0);
  const annualInterestRate = Math.max(toSafeNumber(input.annualInterestRate), 0);
  const comfortablePayment =
    toSafeNumber(input.comfortableMonthlyPayment) > 0
      ? toSafeNumber(input.comfortableMonthlyPayment)
      : Math.max(monthlyIncome * 0.35 - monthlyDebt, 0);
  const maxMortgagePrincipal = roundMoney(principalFromPayment(comfortablePayment, annualInterestRate, years));
  const maxByFinancing = maxMortgagePrincipal / (financingPercent / 100);
  const costProbe = calculatePurchaseCosts({
    price: maxByFinancing,
    propertyKind: input.propertyKind,
    autonomousCommunity: input.autonomousCommunity,
    hasMortgage: true,
  });
  const maxBySavings = savings / ((100 - financingPercent) / 100 + costProbe.totalCosts / Math.max(maxByFinancing, 1));
  const maxRecommendedPrice = roundMoney(Math.max(Math.min(maxByFinancing, maxBySavings), 0));
  const finalCosts = calculatePurchaseCosts({
    price: maxRecommendedPrice,
    propertyKind: input.propertyKind,
    autonomousCommunity: input.autonomousCommunity,
    hasMortgage: true,
  });
  const maxMortgageForPrice = roundMoney(maxRecommendedPrice * (financingPercent / 100));
  const requiredDownPayment = roundMoney(maxRecommendedPrice - maxMortgageForPrice);

  return {
    maxRecommendedPrice,
    maxMortgagePrincipal: maxMortgageForPrice,
    requiredDownPayment,
    estimatedCosts: finalCosts.totalCosts,
    safeSearchMin: roundMoney(maxRecommendedPrice * 0.9),
    safeSearchMax: maxRecommendedPrice,
    recommendedLeadBudget: roundMoney(maxRecommendedPrice * 0.96),
  };
}

export function estimateMonthlyPaymentForBudget(price: number, financingPercent: number, annualInterestRate: number, years: number) {
  return calculateMortgagePayment(price * (financingPercent / 100), annualInterestRate, years);
}
