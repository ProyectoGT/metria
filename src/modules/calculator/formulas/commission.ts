import { roundMoney, toSafeNumber } from "./number";

export type CommissionMode = "base_to_final" | "final_to_net";

export type CommissionInput = {
  mode: CommissionMode;
  price: number;
  commissionPercent: number;
  includeVat: boolean;
};

export type CommissionResult = {
  buyerPrice: number;
  netSeller: number;
  priceWithoutVat: number;
  commission: number;
  commissionVat: number;
  verification: string;
};

const VAT_RATE = 0.21;

function normalizePercent(commissionPercent: number): number {
  return Math.min(Math.max(toSafeNumber(commissionPercent), 0), 99.99) / 100;
}

export function calculateCommissionFromBase(basePrice: number, commissionPercent: number, includeVat: boolean): CommissionResult {
  const price = Math.max(toSafeNumber(basePrice), 0);
  const percent = normalizePercent(commissionPercent);
  const commission = price * percent;
  const commissionVat = includeVat ? commission * VAT_RATE : 0;
  const buyerPrice = price + commission + commissionVat;

  return {
    buyerPrice: roundMoney(buyerPrice),
    netSeller: roundMoney(price),
    priceWithoutVat: roundMoney(price + commission),
    commission: roundMoney(commission),
    commissionVat: roundMoney(commissionVat),
    verification: `${roundMoney(price)} + ${roundMoney(commission)} + ${roundMoney(commissionVat)} = ${roundMoney(buyerPrice)}`,
  };
}

export function calculateCommissionFromFinal(finalPrice: number, commissionPercent: number, includeVat: boolean): CommissionResult {
  const price = Math.max(toSafeNumber(finalPrice), 0);
  const percent = normalizePercent(commissionPercent);
  const divisor = 1 + percent + (includeVat ? percent * VAT_RATE : 0);
  const netSeller = divisor > 0 ? price / divisor : price;
  const commission = netSeller * percent;
  const commissionVat = includeVat ? commission * VAT_RATE : 0;
  const priceWithoutVat = netSeller + commission;

  return {
    buyerPrice: roundMoney(price),
    netSeller: roundMoney(netSeller),
    priceWithoutVat: roundMoney(priceWithoutVat),
    commission: roundMoney(commission),
    commissionVat: roundMoney(commissionVat),
    verification: `${roundMoney(netSeller)} + ${roundMoney(commission)} + ${roundMoney(commissionVat)} = ${roundMoney(price)}`,
  };
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  return input.mode === "base_to_final"
    ? calculateCommissionFromBase(input.price, input.commissionPercent, input.includeVat)
    : calculateCommissionFromFinal(input.price, input.commissionPercent, input.includeVat);
}
