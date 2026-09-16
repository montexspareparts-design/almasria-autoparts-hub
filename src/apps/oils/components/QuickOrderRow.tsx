import { X } from "lucide-react";
import type { OilProduct } from "@/lib/oils/useOilsCatalog";

interface Props {
  product: OilProduct;
  qty: number;
  unitPrice: number;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** سطر طلب سريع — صنف + كمية + إجمالي السطر. */
const QuickOrderRow = ({ product, qty, unitPrice, onQtyChange, onRemove }: Props) => (
  <div className="oils-card !rounded-2xl p-3 flex items-center gap-3" dir="rtl">
    <div className="flex-1 min-w-0">
      <p className="text-[12px] font-bold truncate">{product.name_ar}</p>
      <p className="oils-num text-[10.5px] mt-0.5" style={{ color: "hsl(var(--oils-muted))" }} dir="ltr">
        {product.erp_item_code || product.sku} · {fmt(unitPrice)} ج
      </p>
    </div>
    <input
      type="number"
      inputMode="numeric"
      min={1}
      value={qty}
      onChange={(e) => onQtyChange(Math.max(1, Number(e.target.value) || 1))}
      className="oils-input !w-[64px] !py-2 text-center oils-num"
      aria-label="الكمية"
    />
    <span className="oils-num text-[13px] font-extrabold w-[76px] text-left" style={{ color: "hsl(var(--oils-accent))" }} dir="ltr">
      {fmt(unitPrice * qty)}
    </span>
    <button type="button" onClick={onRemove} aria-label="حذف" className="p-1.5 rounded-lg" style={{ color: "hsl(var(--oils-danger))" }}>
      <X className="w-4 h-4" />
    </button>
  </div>
);

export default QuickOrderRow;
