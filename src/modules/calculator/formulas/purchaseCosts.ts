import type { PropertyKind } from "../types";
import { roundMoney, toSafeNumber } from "./number";

export type PurchaseCostsInput = {
  price: number;
  propertyKind: PropertyKind;
  autonomousCommunity?: string;
  hasMortgage?: boolean;
  firstHome?: boolean;
  buyerAge?: number;
  itpRate?: number;
  ivaRate?: number;
  ajdRate?: number;
  notary?: number;
  registry?: number;
  agency?: number;
  appraisal?: number;
};

export type PurchaseCostsResult = {
  transferTax: number;
  iva: number;
  ajd: number;
  notary: number;
  registry: number;
  agency: number;
  appraisal: number;
  totalCosts: number;
  totalOperation: number;
  recommendedSavings: number;
  appliedTaxLabel: string;
};

const ITP_BY_COMMUNITY: Record<string, number> = {
  cataluna: 10,
  "comunidad valenciana": 10,
  madrid: 6,
  andalucia: 7,
  baleares: 8,
  "islas baleares": 8,
  murcia: 8,
  aragon: 8,
};

function normalizeCommunity(value?: string) {
  return value?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
}

export function getDefaultItpRate(community?: string, firstHome?: boolean, buyerAge?: number): number {
  const base = ITP_BY_COMMUNITY[normalizeCommunity(community)] ?? 10;
  if (firstHome && toSafeNumber(buyerAge) > 0 && toSafeNumber(buyerAge) <= 35) return Math.max(base - 2, 4);
  return base;
}

export function calculatePurchaseCosts(input: PurchaseCostsInput): PurchaseCostsResult {
  const price = Math.max(toSafeNumber(input.price), 0);
  const notary = Math.max(toSafeNumber(input.notary, 900), 0);
  const registry = Math.max(toSafeNumber(input.registry, 500), 0);
  const agency = Math.max(toSafeNumber(input.agency, 450), 0);
  const appraisal = input.hasMortgage ? Math.max(toSafeNumber(input.appraisal, 400), 0) : 0;
  const ivaRate = toSafeNumber(input.ivaRate, 10);
  const ajdRate = toSafeNumber(input.ajdRate, input.propertyKind === "new" ? 1.5 : input.hasMortgage ? 0.5 : 0);
  const itpRate = toSafeNumber(input.itpRate, getDefaultItpRate(input.autonomousCommunity, input.firstHome, input.buyerAge));

  const transferTax = input.propertyKind === "used" ? roundMoney(price * (itpRate / 100)) : 0;
  const iva = input.propertyKind === "new" ? roundMoney(price * (ivaRate / 100)) : 0;
  const ajd = roundMoney(price * (ajdRate / 100));
  const totalCosts = roundMoney(transferTax + iva + ajd + notary + registry + agency + appraisal);

  return {
    transferTax,
    iva,
    ajd,
    notary,
    registry,
    agency,
    appraisal,
    totalCosts,
    totalOperation: roundMoney(price + totalCosts),
    recommendedSavings: roundMoney(price * 0.2 + totalCosts),
    appliedTaxLabel: input.propertyKind === "new" ? `IVA ${ivaRate}%` : `ITP ${itpRate}%`,
  };
}
