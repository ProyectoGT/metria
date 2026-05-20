import { describe, expect, it } from "vitest";
import { calculateMortgagePayment, calculateMortgage, calculateDebtRatio, calculateAdvancedMortgage } from "@/modules/calculator/formulas/mortgage";
import { calculatePurchaseCosts } from "@/modules/calculator/formulas/purchaseCosts";
import { calculateHomePurchase, calculatePurchaseViability } from "@/modules/calculator/formulas/purchase";
import { calculateInvestmentYield } from "@/modules/calculator/formulas/investment";
import { calculatePlusvaliaEstimate } from "@/modules/calculator/formulas/plusvalia";
import { calculateSellerNet } from "@/modules/calculator/formulas/sellerNet";
import { calculateCommission, calculateSimplifiedCalculator } from "@/modules/calculator/formulas/commission";
import { isValidNumberInput, parseNumberInput } from "@/modules/calculator/formulas/number";

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

  it("recalculates simplified commission from current seller net, commission and VAT", () => {
    const result = calculateSimplifiedCalculator({
      netSeller: 650000,
      commissionPercent: 6,
      ivaPercent: 21,
      ivaEnabled: true,
    });

    expect(result.sellerNet).toBe(650000);
    expect(result.agencyCommission).toBe(39000);
    expect(result.commissionVat).toBe(8190);
    expect(result.buyerPrice).toBe(697190);
  });

  it("derives advanced mortgage financing from current price and down payment", () => {
    const base = calculateAdvancedMortgage({
      propertyPrice: 519000,
      downPayment: 348000,
      annualInterestRate: 3.6,
      years: 30,
      monthlyIncome: 3500,
      monthlyDebt: 150,
    });
    const higherRate = calculateAdvancedMortgage({
      propertyPrice: 519000,
      downPayment: 348000,
      annualInterestRate: 4.6,
      years: 30,
      monthlyIncome: 3500,
      monthlyDebt: 150,
    });

    expect(base.financedAmount).toBe(171000);
    expect(base.principal).toBe(171000);
    expect(higherRate.monthlyPayment).toBeGreaterThan(base.monthlyPayment);
    expect(higherRate.totalInterest).toBeGreaterThan(base.totalInterest);
  });

  it("recalculates investment yield from current rent and investment", () => {
    const result = calculateInvestmentYield({
      purchasePrice: 180000,
      purchaseCosts: 18000,
      renovation: 17000,
      furniture: 0,
      monthlyRent: 3650,
      annualIbi: 0,
      monthlyCommunity: 0,
      annualInsurance: 0,
      annualMaintenance: 0,
      vacancyPercent: 0,
      monthlyMortgagePayment: 0,
    });

    expect(result.annualRent).toBe(43800);
    expect(result.totalInvestment).toBe(215000);
    expect(result.grossYield).toBeCloseTo(20.37, 2);
  });

  it("recalculates home purchase financing and handles cash mode without stale mortgage", () => {
    const mortgage = calculateHomePurchase({
      price: 387000,
      savings: 300000,
      propertyKind: "used",
      autonomousCommunity: "Madrid",
      financingPercent: 33,
      annualInterestRate: 3.5,
      years: 30,
      monthlyIncome: 5000,
      monthlyDebt: 0,
      paymentMode: "mortgage",
      firstHome: false,
      buyerAge: 40,
    });
    const cash = calculateHomePurchase({
      price: 387000,
      savings: 300000,
      propertyKind: "used",
      autonomousCommunity: "Madrid",
      financingPercent: 80,
      annualInterestRate: 3.5,
      years: 30,
      monthlyIncome: 5000,
      monthlyDebt: 0,
      paymentMode: "cash",
      firstHome: false,
      buyerAge: 40,
    });

    expect(mortgage.mortgagePrincipal).toBeCloseTo(127710, 0);
    expect(mortgage.requiredDownPayment).toBeCloseTo(259290, 0);
    expect(cash.mortgagePrincipal).toBe(0);
    expect(cash.monthlyPayment).toBe(0);
    expect(cash.requiredDownPayment).toBe(387000);
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

  it("validates number input correctly", () => {
    expect(isValidNumberInput("123")).toBe(true);
    expect(isValidNumberInput("123,45")).toBe(true);
    expect(isValidNumberInput("1.000")).toBe(true);
    expect(isValidNumberInput("1.000,50")).toBe(true);
    expect(isValidNumberInput("")).toBe(true);
    expect(isValidNumberInput("abc")).toBe(false);
    expect(isValidNumberInput("12%")).toBe(false);
    expect(isValidNumberInput("1,2,3")).toBe(false);
    expect(isValidNumberInput("12.34.56")).toBe(true); // multiple dots OK (thousands separators)
    expect(isValidNumberInput("   ")).toBe(true); // whitespace
  });

  it("handles parseNumberInput edge cases", () => {
    expect(parseNumberInput("", 100)).toBe(100); // returns fallback for empty
    expect(Number.isNaN(parseNumberInput("abc", NaN))).toBe(true); // NaN fallback preserves NaN
    expect(parseNumberInput("123", NaN)).toBe(123); // valid parse with NaN fallback
    expect(parseNumberInput("1.500,75", 0)).toBe(1500.75); // Spanish format
    expect(parseNumberInput("1500.75", 0)).toBe(1500.75); // English format
  });

  it("calculates commission scenarios correctly", () => {
    // Caso 1: 300.000 €, 5%, IVA activo
    const c1 = calculateCommission({ mode: "base_to_final", price: 300000, commissionPercent: 5, includeVat: true });
    expect(c1.commission).toBe(15000);
    expect(c1.commissionVat).toBe(3150);
    expect(c1.buyerPrice).toBe(318150);
    expect(c1.netSeller).toBe(300000);

    // Caso 2: 400.000 €, 3%, IVA activo
    const c2 = calculateCommission({ mode: "base_to_final", price: 400000, commissionPercent: 3, includeVat: true });
    expect(c2.commission).toBe(12000);
    expect(c2.commissionVat).toBe(2520);
    expect(c2.buyerPrice).toBe(414520);
    expect(c2.netSeller).toBe(400000);

    // Caso 3: 500.000 €, 10%, IVA desactivado
    const c3 = calculateCommission({ mode: "base_to_final", price: 500000, commissionPercent: 10, includeVat: false });
    expect(c3.commission).toBe(50000);
    expect(c3.commissionVat).toBe(0);
    expect(c3.buyerPrice).toBe(550000);
    expect(c3.netSeller).toBe(500000);

    // Caso 4: final_to_net — 400.000 € final, 3%, IVA activo
    const c4 = calculateCommission({ mode: "final_to_net", price: 400000, commissionPercent: 3, includeVat: true });
    expect(c4.buyerPrice).toBe(400000);
    expect(c4.netSeller).toBeCloseTo(385988.61, 1); // Redondeo a 1 decimal por precisión
    expect(c4.commission).toBeCloseTo(11579.66, 1);
    expect(c4.commissionVat).toBeCloseTo(2431.73, 1);
  });
});
