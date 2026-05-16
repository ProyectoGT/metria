import { z } from "zod";
import { interestPercent, mortgageYears, positiveMoney, positivePercent, propertyKindSchema } from "./common";

export const maxBudgetSchema = z.object({
  savings: positiveMoney,
  monthlyIncome: positiveMoney,
  monthlyDebt: positiveMoney,
  comfortableMonthlyPayment: positiveMoney,
  years: mortgageYears,
  annualInterestRate: interestPercent,
  financingPercent: positivePercent,
  autonomousCommunity: z.string().trim().optional(),
  propertyKind: propertyKindSchema,
});

export type MaxBudgetFormValues = z.infer<typeof maxBudgetSchema>;
