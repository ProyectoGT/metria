export function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0 €";
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function formatDecimal(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number): string {
  return `${formatDecimal(value, 2)}%`;
}
