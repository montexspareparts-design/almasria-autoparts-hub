import Button from "./Button";
import { formatPrice } from "../format";

export interface StickyTotalBarProps {
  total: number;
  currency?: string;
  label?: string;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
  hint?: string;
}

export const StickyTotalBar = ({
  total,
  currency = "ج.م",
  label = "الإجمالي",
  actionLabel,
  onAction,
  loading,
  hint,
}: StickyTotalBarProps) => (
  <div className="ds-sticky-total flex items-center gap-4">
    <div className="flex flex-col">
      <span className="ds-micro" style={{ color: "var(--ink-500)" }}>
        {label}
      </span>
      <span className="ds-price-md ds-num">
        {formatPrice(total)} <span className="ds-caption" style={{ color: "var(--ink-500)" }}>{currency}</span>
      </span>
      {hint && (
        <span className="ds-micro" style={{ color: "var(--ink-500)" }}>
          {hint}
        </span>
      )}
    </div>
    <div className="flex-1">
      <Button variant="accent" size="lg" block loading={loading} onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  </div>
);

export default StickyTotalBar;
