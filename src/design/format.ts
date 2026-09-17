/** Latin digits, thousands separators, tabular-friendly formatting. */

export const formatNumber = (value: number, fractionDigits?: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? (Number.isInteger(value) ? 0 : 2),
  }).format(value);

export const formatPrice = (value: number, fractionDigits?: number) =>
  formatNumber(value, fractionDigits);
