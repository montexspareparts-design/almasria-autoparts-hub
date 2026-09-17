import { Package } from "lucide-react";
import Card from "./Card";
import PriceBlock from "./PriceBlock";
import StockBadge, { type StockState } from "./StockBadge";
import QtyStepper from "./QtyStepper";
import Button from "./Button";

export interface ProductCardProps {
  brand: string;
  title: string;
  partNumber: string;
  imageUrl?: string;
  stock: StockState;
  updatedAgo?: string;
  finalPrice: number;
  listPrice?: number;
  discountReason?: string;
  unitLabel?: string;
  qty?: number;
  step?: number;
  onQtyChange?: (qty: number) => void;
  onAdd?: () => void;
}

export const ProductCard = ({
  brand,
  title,
  partNumber,
  imageUrl,
  stock,
  updatedAgo,
  finalPrice,
  listPrice,
  discountReason,
  unitLabel,
  qty,
  step = 1,
  onQtyChange,
  onAdd,
}: ProductCardProps) => (
  <Card className="flex gap-4">
    <div
      className="w-[72px] h-[72px] shrink-0 grid place-items-center overflow-hidden"
      style={{ background: "var(--surface-100)", borderRadius: "var(--r-md)" }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-full h-full object-contain" loading="lazy" />
      ) : (
        <Package className="w-6 h-6" strokeWidth={1.5} style={{ color: "var(--ink-300)" }} />
      )}
    </div>

    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className="ds-micro" style={{ color: "var(--ink-500)", letterSpacing: "0.04em" }}>
          {brand}
        </span>
        <p className="ds-body-strong line-clamp-2">{title}</p>
        <span className="ds-mono ds-micro" dir="ltr" style={{ color: "var(--ink-500)", textAlign: "start" }}>
          {partNumber}
        </span>
      </div>

      <StockBadge state={stock} updatedAgo={updatedAgo} />

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PriceBlock
          finalPrice={finalPrice}
          listPrice={listPrice}
          discountReason={discountReason}
          unitLabel={unitLabel}
          size="sm"
        />
        {onQtyChange && qty !== undefined ? (
          <QtyStepper value={qty} onChange={onQtyChange} step={step} min={0} unitLabel={unitLabel} />
        ) : (
          <Button variant="secondary" onClick={onAdd} disabled={stock === "out"}>
            أضف
          </Button>
        )}
      </div>
    </div>
  </Card>
);

export default ProductCard;
