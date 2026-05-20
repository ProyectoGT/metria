import { roundMoney, toSafeNumber } from "./number";

export type SellerNetInput = {
  salePrice: number;
  pendingMortgage?: number;
  agencyFees?: number;
  agencyFeePercent?: number;
  includeVatOnFees?: boolean;
  plusvalia?: number;
  mortgageCancellation?: number;
  certificates?: number;
  otherCosts?: number;
  estimatedTaxes?: number;
};

export type SellerNetResult = {
  agencyFees: number;
  agencyVat: number;
  totalSaleCosts: number;
  netForOwner: number;
  minimumRecommendedPrice: number;
  marginAfterMortgage: number;
  summary: string;
};

export function calculateSellerNet(input: SellerNetInput): SellerNetResult {
  const salePrice = Math.max(toSafeNumber(input.salePrice), 0);
  const percentageFees = salePrice * (Math.max(toSafeNumber(input.agencyFeePercent), 0) / 100);
  const manualFees = Math.max(toSafeNumber(input.agencyFees), 0);
  const agencyFees = roundMoney(manualFees > 0 ? manualFees : percentageFees);
  const agencyVat = input.includeVatOnFees ? roundMoney(agencyFees * 0.21) : 0;
  const pendingMortgage = Math.max(toSafeNumber(input.pendingMortgage), 0);
  const totalSaleCosts = roundMoney(
    agencyFees +
      agencyVat +
      pendingMortgage +
      Math.max(toSafeNumber(input.plusvalia), 0) +
      Math.max(toSafeNumber(input.mortgageCancellation), 0) +
      Math.max(toSafeNumber(input.certificates), 0) +
      Math.max(toSafeNumber(input.otherCosts), 0) +
      Math.max(toSafeNumber(input.estimatedTaxes), 0),
  );
  const netForOwner = roundMoney(salePrice - totalSaleCosts);

  return {
    agencyFees,
    agencyVat,
    totalSaleCosts,
    netForOwner,
    minimumRecommendedPrice: roundMoney(totalSaleCosts + Math.max(salePrice * 0.1, 10000)),
    marginAfterMortgage: roundMoney(salePrice - pendingMortgage),
    summary: `Si vende por ${roundMoney(salePrice)} €, los costes estimados son ${totalSaleCosts} € y el neto aproximado para propietario es ${netForOwner} €.`,
  };
}
