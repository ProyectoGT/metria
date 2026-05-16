import { describe, expect, it } from "vitest";
import { calculateMortgagePayment, calculateMortgage, calculateDebtRatio } from "@/modules/calculator/formulas/mortgage";
import { calculatePurchaseCosts } from "@/modules/calculator/formulas/purchaseCosts";
import { calculatePurchaseViability } from "@/modules/calculator/formulas/purchase";
import { calculateInvestmentYield } from "@/modules/calculator/formulas/investment";
import { calculatePlusvaliaEstimate } from "@/modules/calculator/formulas/plusvalia";
import { calculateSellerNet } from "@/modules/calculator/formulas/sellerNet";
import { calculateCommission } from "@/modules/calculator/formulas/commission";

describe("calculator formulas", () => {
  it("handles empty or zero mortgage values without NaN", () => {
    expect(calculateMortgagePayment(0, 3.5, 30)).toBe(0);
    const result = calculateMortgage({ principal: 0, annualInterestRate: 0, years: 30, monthlyIncome: 0 });
    expect(Number.isNaN(result.monthlyPayment)).toBe(false);
    expect(result.monthlyPayment).toBe(0);
  });

  it("calculates zero interest and high interest mortgage scenarios", () => {
    expect(calculateMortgagePayment(240000, 0, 30)).toBe(666.67);
    expect(calculateMortgagePayment(240000, 10, 30)).toBeGreaterThan(2000);
  });

  it("calculates 20, 25 and 30 year mortgage ratios", () => {
    const twenty = calculateMortgage({ principal: 240000, annualInterestRate: 3.5, years: 20, monthlyIncome: 4000 });
    const thirty = calculateMortgage({ principal: 240000, annualInterestRate: 3.5, years: 30, monthlyIncome: 4000 });
    expect(twenty.monthlyPayment).toBeGreaterThan(thirty.monthlyPayment);
    expect(calculateDebtRatio(thirty.monthlyPayment, 4000)).toBeGreaterThan(0);
  });

  it("calculates purchase costs for new and used homes", () => {
    const used = calculatePurchaseCosts({ price: 300000, propertyKind: "used", autonomousCommunity: "Madrid", hasMortgage: true });
    const fresh = calculatePurchaseCosts({ price: 300000, propertyKind: "new", autonomousCommunity: "Madrid", hasMortgage: true });
    expect(used.transferTax).toBe(18000);
    expect(fresh.iva).toBe(30000);
    expect(used.totalCosts).toBeGreaterThan(0);
  });

  it("classifies purchase viability", () => {
    const base = {
      price: 250000,
      propertyKind: "used" as const,
      autonomousCommunity: "Madrid",
      financingPercent: 80,
      annualInterestRate: 3,
      years: 30,
      monthlyDebt: 0,
      paymentMode: "mortgage" as const,
      firstHome: false,
      buyerAge: 40,
    };
    expect(calculatePurchaseViability({ ...base, savings: 90000, monthlyIncome: 5000 }).viability).toBe("viable");
    expect(calculatePurchaseViability({ ...base, savings: 65000, monthlyIncome: 3000 }).viability).toBe("tight");
    expect(calculatePurchaseViability({ ...base, savings: 10000, monthlyIncome: 1500 }).viability).toBe("not_viable");
  });

  it("calculates investment positive and negative cashflow", () => {
    const positive = calculateInvestmentYield({ purchasePrice: 150000, purchaseCosts: 15000, monthlyRent: 1200, monthlyMortgagePayment: 500 });
    const negative = calculateInvestmentYield({ purchasePrice: 250000, purchaseCosts: 25000, monthlyRent: 700, monthlyMortgagePayment: 1300 });
    expect(positive.monthlyCashflow).toBeGreaterThan(0);
    expect(negative.monthlyCashflow).toBeLessThan(0);
  });

  it("rejects invalid plusvalia date ranges safely", () => {
    const result = calculatePlusvaliaEstimate({
      purchaseDate: "2026-01-01",
      saleDate: "2025-01-01",
      landCadastralValue: 90000,
      purchasePrice: 200000,
      salePrice: 300000,
    });
    expect(result.isValidDateRange).toBe(false);
    expect(result.estimatedAmount).toBe(0);
  });

  it("calculates seller net with pending mortgage", () => {
    const result = calculateSellerNet({
      salePrice: 300000,
      pendingMortgage: 90000,
      agencyFeePercent: 5,
      includeVatOnFees: true,
      plusvalia: 3500,
    });
    expect(result.netForOwner).toBeLessThan(210000);
    expect(result.totalSaleCosts).toBeGreaterThan(100000);
  });

  it("calculates quick commission in both directions", () => {
    const final = calculateCommission({ mode: "base_to_final", price: 300000, commissionPercent: 5, includeVat: true });
    const net = calculateCommission({ mode: "final_to_net", price: final.buyerPrice, commissionPercent: 5, includeVat: true });
    const withoutVat = calculateCommission({ mode: "base_to_final", price: 300000, commissionPercent: 5, includeVat: false });
    expect(final.commission).toBe(15000);
    expect(final.commissionVat).toBe(3150);
    expect(final.buyerPrice).toBe(318150);
    expect(withoutVat.buyerPrice).toBe(315000);
    expect(net.netSeller).toBeCloseTo(300000, 0);
  });

  it("recalculates quick commission from the current amount instead of the default", () => {
    const final = calculateCommission({ mode: "base_to_final", price: 473000, commissionPercent: 5, includeVat: true });
    const net = calculateCommission({ mode: "final_to_net", price: 501616.5, commissionPercent: 5, includeVat: true });

    expect(final.commission).toBe(23650);
    expect(final.commissionVat).toBe(4966.5);
    expect(final.buyerPrice).toBe(501616.5);
    expect(final.netSeller).toBe(473000);
    expect(final.verification).toBe("473000 + 23650 + 4966.5 = 501616.5");
    expect(net.netSeller).toBeCloseTo(473000, 0);
  });
});
