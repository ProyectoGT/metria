import type { ViabilityStatus } from "../types";
import { roundMoney, roundPercent, toSafeNumber } from "./number";

export type MortgageInput = {
  principal: number;
  annualInterestRate: number;
  years: number;
  monthlyIncome?: number;
  monthlyDebt?: number;
};

export type MortgageResult = {
  principal: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  debtRatio: number;
  months: number;
  viability: ViabilityStatus;
};

export function calculateMortgagePayment(principal: number, annualInterestRate: number, years: number): number {
  principal = Math.max(toSafeNumber(principal), 0);
  annualInterestRate = Math.max(toSafeNumber(annualInterestRate), 0);
  years = Math.max(toSafeNumber(years), 0);
  if (principal <= 0 || years <= 0) return 0;
  const months = Math.round(years * 12);
  const monthlyRate = annualInterestRate / 100 / 12;
  if (monthlyRate <= 0) return roundMoney(principal / months);
  const factor = Math.pow(1 + monthlyRate, months);
  return roundMoney((principal * monthlyRate * factor) / (factor - 1));
}

export function calculateTotalInterest(principal: number, monthlyPayment: number, years: number): number {
  principal = Math.max(toSafeNumber(principal), 0);
  monthlyPayment = Math.max(toSafeNumber(monthlyPayment), 0);
  years = Math.max(toSafeNumber(years), 0);
  if (principal <= 0 || monthlyPayment <= 0 || years <= 0) return 0;
  return roundMoney(monthlyPayment * years * 12 - principal);
}

export function calculateTotalLoanCost(principal: number, monthlyPayment: number, years: number): number {
  principal = Math.max(toSafeNumber(principal), 0);
  monthlyPayment = Math.max(toSafeNumber(monthlyPayment), 0);
  years = Math.max(toSafeNumber(years), 0);
  if (principal <= 0 || monthlyPayment <= 0 || years <= 0) return 0;
  return roundMoney(monthlyPayment * years * 12);
}

export function calculateDebtRatio(monthlyPayment: number, monthlyIncome: number, monthlyDebt = 0): number {
  monthlyPayment = Math.max(toSafeNumber(monthlyPayment), 0);
  monthlyIncome = Math.max(toSafeNumber(monthlyIncome), 0);
  monthlyDebt = Math.max(toSafeNumber(monthlyDebt), 0);
  if (monthlyIncome <= 0) return 0;
  return roundPercent(((monthlyPayment + monthlyDebt) / monthlyIncome) * 100);
}

export function getViabilityByDebtRatio(debtRatio: number): ViabilityStatus {
  if (debtRatio <= 35) return "viable";
  if (debtRatio <= 45) return "tight";
  return "not_viable";
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const principal = Math.max(toSafeNumber(input.principal), 0);
  const years = Math.max(toSafeNumber(input.years), 0);
  const monthlyPayment = calculateMortgagePayment(principal, input.annualInterestRate, years);
  const totalInterest = calculateTotalInterest(principal, monthlyPayment, years);
  const totalPaid = calculateTotalLoanCost(principal, monthlyPayment, years);
  const debtRatio = calculateDebtRatio(monthlyPayment, input.monthlyIncome ?? 0, input.monthlyDebt ?? 0);

  return {
    principal,
    monthlyPayment,
    totalPaid,
    totalInterest,
    debtRatio,
    months: Math.round(years * 12),
    viability: getViabilityByDebtRatio(debtRatio),
  };
}

export function calculateMortgageTermScenarios(input: MortgageInput, terms = [20, 25, 30]) {
  return terms.map((years) => calculateMortgage({ ...input, years }));
}

export function calculateMortgageRateScenarios(input: MortgageInput, delta = 0.5) {
  return [input.annualInterestRate - delta, input.annualInterestRate, input.annualInterestRate + delta].map(
    (annualInterestRate) => calculateMortgage({ ...input, annualInterestRate: Math.max(annualInterestRate, 0) }),
  );
}
