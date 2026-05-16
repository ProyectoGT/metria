import { z } from "zod";
import { positiveMoney, positivePercent } from "./common";

export const sellerNetSchema = z.object({
  salePrice: positiveMoney,
  pendingMortgage: positiveMoney,
  agencyFees: positiveMoney,
  agencyFeePercent: positivePercent,
  includeVatOnFees: z.boolean(),
  plusvalia: positiveMoney,
  mortgageCancellation: positiveMoney,
  certificates: positiveMoney,
  otherCosts: positiveMoney,
  estimatedTaxes: positiveMoney,
});

export type SellerNetFormValues = z.infer<typeof sellerNetSchema>;
