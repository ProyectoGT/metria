import { z } from "zod";
import { positiveMoney, positivePercent, propertyKindSchema } from "./common";

export const purchaseCostsSchema = z.object({
  price: positiveMoney,
  autonomousCommunity: z.string().trim().optional(),
  propertyKind: propertyKindSchema,
  hasMortgage: z.boolean(),
  firstHome: z.boolean(),
  buyerAge: z.coerce.number().int().min(0).max(100),
  itpRate: positivePercent,
  ivaRate: positivePercent,
  ajdRate: positivePercent,
  notary: positiveMoney,
  registry: positiveMoney,
  agency: positiveMoney,
  appraisal: positiveMoney,
  financingPercent: positivePercent,
});

export type PurchaseCostsFormValues = z.infer<typeof purchaseCostsSchema>;
