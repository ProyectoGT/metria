import { z } from "zod";
import { positiveMoney, positivePercent } from "./common";

export const investmentSchema = z.object({
  purchasePrice: positiveMoney,
  purchaseCosts: positiveMoney,
  renovation: positiveMoney,
  furniture: positiveMoney,
  monthlyRent: positiveMoney,
  annualIbi: positiveMoney,
  monthlyCommunity: positiveMoney,
  annualInsurance: positiveMoney,
  annualMaintenance: positiveMoney,
  vacancyPercent: positivePercent,
  hasFinancing: z.boolean(),
  monthlyMortgagePayment: positiveMoney,
  targetYield: positivePercent,
});

export type InvestmentFormValues = z.infer<typeof investmentSchema>;
