import { useState } from "react";
import { Minus, Plus, Package } from "lucide-react";
import { motion } from "framer-motion";
import type { OilProduct } from "@/lib/oils/useOilsCatalog";
import type { QuantityDiscount } from "@/lib/oils/useOilsCatalog";
import TierPriceBadge from "./TierPriceBadge";
import { haptic } from "@/lib/haptics";

interface Props {
  product: OilProduct;
  discounts: QuantityDiscount[];
  canSeePrice: boolean;
  onAdd: (product: OilProduct, qty: number) => void;
}

const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });

/**
 * كارت منتج زيت — يلتزم بقاعدة الأعمدة الثلاثة:
 * كود الصنف + بارت نمبر + اسم الصنف.
 */
const OilProductCard = ({ product, discounts, canSeePrice, onAdd }: Props) => {
  const [qty, setQty] = useState(Math.max(1, product.min_order_qty || 1));
  const outOfStock = product.stock_quantity <= 0;

  const nextDiscount = discounts.find((d) => qty < d.min_quantity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="oils-card p-3.5 flex gap-3"
      dir="rtl"
    >
      {/* صورة */}
      <div className="w-[74px] h-[74px] rounded-xl bg-white grid place-items-center shrink-0 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name_ar} loading="lazy" className="w-full h-full object-contain" />
        ) : (
          <Package className="w-7 h-7 text-neutral-300" />
        )}
      </div>

      {/* البيانات */}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold leading-snug line-clamp-2">{product.name_ar}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {product.erp_item_code && <span className="oils-chip oils-num">كود: {product.erp_item_code}</span>}
          {product.part_number && <span className="oils-chip oils-num" dir="ltr">{product.part_number}</span>}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {canSeePrice ? (
            <div>
              <span className="oils-num text-[16px] font-extrabold" style={{ color: "hsl(var(--oils-accent))" }}>
                {fmt(product.price)} <span className="text-[10px] font-bold">ج.م</span>
              </span>
              {product.tierPrice && (
                <span className="oils-num text-[10.5px] line-through mr-2" style={{ color: "hsl(var(--oils-muted))" }}>
                  {fmt(product.base_price)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] font-bold" style={{ color: "hsl(var(--oils-muted))" }}>سجّل دخولك لرؤية سعر الجملة</span>
          )}

          {/* الكمية */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="تقليل"
              className="w-7 h-7 rounded-lg grid place-items-center"
              style={{ background: "hsl(var(--oils-card-hi))", border: "1px solid hsl(var(--oils-line))" }}
              onClick={() => { void haptic("light"); setQty((q) => Math.max(1, q - 1)); }}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="oils-num w-7 text-center text-[13px] font-extrabold">{qty}</span>
            <button
              type="button"
              aria-label="زيادة"
              className="w-7 h-7 rounded-lg grid place-items-center"
              style={{ background: "hsl(var(--oils-card-hi))", border: "1px solid hsl(var(--oils-line))" }}
              onClick={() => { void haptic("light"); setQty((q) => q + 1); }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <TierPriceBadge product={product} />
            {nextDiscount && canSeePrice && (
              <span className="oils-chip oils-num">
                خصم عند {nextDiscount.min_quantity}+ قطعة
              </span>
            )}
            {outOfStock && (
              <span className="oils-chip" style={{ color: "hsl(var(--oils-danger))", borderColor: "hsl(var(--oils-danger) / 0.4)" }}>
                نافد حاليًا
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={outOfStock}
            className="oils-btn-primary !w-auto !py-2 !px-4 !text-[12px] !rounded-xl shrink-0"
            onClick={() => { void haptic("medium"); onAdd(product, qty); }}
          >
            أضف
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default OilProductCard;
