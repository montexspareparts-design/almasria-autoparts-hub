import { formatPrice } from "../format";

export interface PriceBlockProps {
  finalPrice: number;
  listPrice?: number;
  currency?: string;
  /** مثال: "سعر جملة" أو "خصم كمية 12+" */
  discountReason?: string;
  /** مثال: "للجركن" */
  unitLabel?: string;
  size?: "sm" | "md" | "lg";
  /** يعرض السعر النهائي باللون الأحمر (استخدام محدود جدًا) */
  emphasized?: boolean;
  fractionDigits?: number;
}

const SIZE_CLASS = { sm: "ds-price-sm", md: "ds-price-md", lg: "ds-price-lg" } as const;

export const PriceBlock = ({
  finalPrice,
  listPrice,
  currency = "ج.م",
  discountReason,
  unitLabel,
  size = "md",
  emphasized,
  fractionDigits,
}: PriceBlockProps) => (
  <div className="flex flex-col gap-1 items-start">
    <div className="flex items-baseline gap-2 flex-wrap">
      <span
        className={`${SIZE_CLASS[size]} ds-num`}
        style={{ color: emphasized ? "var(--brand-red)" : "var(--ink-900)" }}
      >
        {formatPrice(finalPrice, fractionDigits)}
      </span>
      <span className="ds-caption" style={{ color: "var(--ink-500)" }}>
        {currency}
      </span>
      {listPrice !== undefined && listPrice > finalPrice && (
        <span
          className="ds-caption ds-num"
          style={{ color: "var(--ink-500)", textDecoration: "line-through" }}
        >
          {formatPrice(listPrice, fractionDigits)}
        </span>
      )}
      {unitLabel && (
        <span className="ds-micro" style={{ color: "var(--ink-500)" }}>
          {unitLabel}
        </span>
      )}
    </div>
    {discountReason && (
      <span className="ds-chip ds-chip--red">{discountReason}</span>
    )}
  </div>
);

export default PriceBlock;
