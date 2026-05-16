import { z } from "zod";
import { interestPercent, mortgageKindSchema, mortgageYears, positiveMoney, positivePercent } from "./common";

export const mortgageSchema = z.object({
  price: positiveMoney,
  downPayment: positiveMoney,
  principal: positiveMoney,
  financingPercent: positivePercent,
  annualInterestRate: interestPercent,
  tae: positivePercent,
  years: mortgageYears,
  mortgageKind: mortgageKindSchema,
  monthlyIncome: positiveMoney,
  monthlyDebt: positiveMoney,
});

export type MortgageFormValues = z.infer<typeof mortgageSchema>;
