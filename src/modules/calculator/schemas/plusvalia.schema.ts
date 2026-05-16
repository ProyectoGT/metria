import { z } from "zod";
import { positiveMoney, positivePercent } from "./common";

export const plusvaliaSchema = z
  .object({
    mode: z.enum(["simple", "advanced"]),
    municipality: z.string().trim().optional(),
    purchaseDate: z.string().optional(),
    saleDate: z.string().optional(),
    landCadastralValue: positiveMoney,
    purchasePrice: positiveMoney,
    salePrice: positiveMoney,
    municipalCoefficient: z.coerce.number().min(0).max(1),
    landPercentage: positivePercent,
    taxRate: positivePercent,
    bonusPercent: positivePercent,
  })
  .superRefine((value, ctx) => {
    if (value.purchaseDate && value.saleDate && new Date(value.saleDate) <= new Date(value.purchaseDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["saleDate"],
        message: "La fecha de venta debe ser posterior a la compra",
      });
    }
  });

export type PlusvaliaFormValues = z.infer<typeof plusvaliaSchema>;
