import type { InvestmentStatus } from "../types";
import { roundMoney, roundPercent, toSafeNumber } from "./number";

export type InvestmentInput = {
  purchasePrice: number;
  purchaseCosts?: number;
  renovation?: number;
  furniture?: number;
  monthlyRent: number;
  annualIbi?: number;
  monthlyCommunity?: number;
  annualInsurance?: number;
  annualMaintenance?: number;
  vacancyPercent?: number;
  monthlyMortgagePayment?: number;
  targetYield?: number;
};

export type InvestmentResult = {
  grossYield: number;
  netYield: number;
  monthlyCashflow: number;
  annualCashflow: number;
  initialInvestment: number;
  paybackYears: number;
  maxPriceForTargetYield: number;
  status: InvestmentStatus;
};

export function getInvestmentStatus(netYield: number, monthlyCashflow: number): InvestmentStatus {
  if (netYield >= 5 && monthlyCashflow >= 0) return "good";
  if (netYield >= 3.5 || monthlyCashflow >= 0) return "tight";
  return "weak";
}

export function calculateInvestmentYield(input: InvestmentInput): InvestmentResult {
  const purchasePrice = Math.max(toSafeNumber(input.purchasePrice), 0);
  const initialInvestment = roundMoney(
    purchasePrice + Math.max(toSafeNumber(input.purchaseCosts), 0) + Math.max(toSafeNumber(input.renovation), 0) + Math.max(toSafeNumber(input.furniture), 0),
  );
  const grossIncome = Math.max(toSafeNumber(input.monthlyRent), 0) * 12;
  const vacancyCost = grossIncome * (Math.max(toSafeNumber(input.vacancyPercent), 0) / 100);
  const annualOperatingCosts =
    Math.max(toSafeNumber(input.annualIbi), 0) +
    Math.max(toSafeNumber(input.monthlyCommunity), 0) * 12 +
    Math.max(toSafeNumber(input.annualInsurance), 0) +
    Math.max(toSafeNumber(input.annualMaintenance), 0) +
    vacancyCost;
  const annualMortgage = Math.max(toSafeNumber(input.monthlyMortgagePayment), 0) * 12;
  const netIncomeBeforeDebt = grossIncome - annualOperatingCosts;
  const annualCashflow = roundMoney(netIncomeBeforeDebt - annualMortgage);
  const monthlyCashflow = roundMoney(annualCashflow / 12);
  const grossYield = initialInvestment > 0 ? roundPercent((grossIncome / initialInvestment) * 100) : 0;
  const netYield = initialInvestment > 0 ? roundPercent((netIncomeBeforeDebt / initialInvestment) * 100) : 0;
  const targetYield = Math.max(toSafeNumber(input.targetYield, 5), 0);

  return {
    grossYield,
    netYield,
    monthlyCashflow,
    annualCashflow,
    initialInvestment,
    paybackYears: netIncomeBeforeDebt > 0 ? roundMoney(initialInvestment / netIncomeBeforeDebt) : 0,
    maxPriceForTargetYield: targetYield > 0 ? Math.max(roundMoney((netIncomeBeforeDebt / (targetYield / 100)) - Math.max(toSafeNumber(input.purchaseCosts), 0)), 0) : 0,
    status: getInvestmentStatus(netYield, monthlyCashflow),
  };
}
