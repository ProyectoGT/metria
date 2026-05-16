import { z } from "zod";
import { interestPercent, mortgageYears, paymentModeSchema, positiveMoney, positivePercent, propertyKindSchema } from "./common";

export const purchaseSchema = z.object({
  price: positiveMoney,
  savings: positiveMoney,
  propertyKind: propertyKindSchema,
  autonomousCommunity: z.string().trim().optional(),
  financingPercent: positivePercent,
  annualInterestRate: interestPercent,
  years: mortgageYears,
  monthlyIncome: positiveMoney,
  monthlyDebt: positiveMoney,
  paymentMode: paymentModeSchema,
  firstHome: z.boolean(),
  buyerAge: z.coerce.number().int().min(0).max(100),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
