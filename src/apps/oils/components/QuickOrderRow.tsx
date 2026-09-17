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
  <div className="oils-quick-row" dir="rtl">
    <div className="oils-quick-row-image">
      {product.image_url ? <img src={product.image_url} alt="" /> : null}
    </div>
    <div className="oils-quick-row-copy">
      <p>{product.name_ar}</p>
      <span className="oils-num" dir="ltr">
        {product.erp_item_code || product.sku} · {fmt(unitPrice)} ج
      </span>
    </div>
    <input
      type="number"
      inputMode="numeric"
      min={1}
      value={qty}
      onChange={(e) => onQtyChange(Math.max(1, Number(e.target.value) || 1))}
      className="oils-row-qty oils-num"
      aria-label="الكمية"
    />
    <strong className="oils-num oils-row-total" dir="ltr">
      {fmt(unitPrice * qty)}
    </strong>
    <button type="button" onClick={onRemove} aria-label="حذف" className="oils-row-remove">
      <X className="w-4 h-4" />
    </button>
  </div>
);

export default QuickOrderRow;
