import { z } from "zod";

export const positiveMoney = z.coerce.number().min(0, "Introduce un importe positivo");
export const positivePercent = z.coerce.number().min(0, "Debe ser 0 o superior").max(100, "Debe estar entre 0 y 100");
export const interestPercent = z.coerce.number().min(0, "El interés no puede ser negativo").max(25, "Revisa el interés introducido");
export const mortgageYears = z.coerce.number().int().min(1, "Mínimo 1 año").max(40, "Máximo 40 años");

export const propertyKindSchema = z.enum(["new", "used"]);
export const paymentModeSchema = z.enum(["mortgage", "cash", "mixed"]);
export const mortgageKindSchema = z.enum(["fixed", "variable", "mixed"]);

export function emptyToZero(value: unknown) {
  return value === "" || value == null ? 0 : value;
}
