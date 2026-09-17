import Badge from "./Badge";

export type StockState = "available" | "limited" | "out";

const MAP: Record<StockState, { label: string; tone: "success" | "warning" | "neutral" }> = {
  available: { label: "متاح", tone: "success" },
  limited: { label: "كمية محدودة", tone: "warning" },
  out: { label: "غير متاح", tone: "neutral" },
};

export interface StockBadgeProps {
  state: StockState;
  /** مثال: "منذ 5 د" */
  updatedAgo?: string;
}

export const StockBadge = ({ state, updatedAgo }: StockBadgeProps) => {
  const { label, tone } = MAP[state];
  return (
    <span className="inline-flex items-center gap-2">
      <Badge tone={tone} dot>
        {label}
      </Badge>
      {updatedAgo && (
        <span className="ds-micro" style={{ color: "var(--ink-500)" }}>
          آخر تحديث: {updatedAgo}
        </span>
      )}
    </span>
  );
};

export default StockBadge;
