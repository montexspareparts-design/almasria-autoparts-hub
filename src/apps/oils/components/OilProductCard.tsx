import { useState } from "react";
import { Minus, Plus, Package, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { OilProduct } from "@/lib/oils/useOilsCatalog";
import type { QuantityDiscount } from "@/lib/oils/useOilsCatalog";
import TierPriceBadge from "./TierPriceBadge";
import { haptic } from "@/lib/haptics";
import TransparentProductImage from "./TransparentProductImage";

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
  const navigate = useNavigate();
  const [qty, setQty] = useState(Math.max(1, product.min_order_qty || 1));
  const outOfStock = product.stock_quantity <= 0;

  const nextDiscount = discounts.find((d) => qty < d.min_quantity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="oil-product-card"
      dir="rtl"
    >
      <button type="button" className="oil-product-visual" onClick={() => navigate(`/oils/product/${product.id}`)} aria-label={`عرض ${product.name_ar}`}>
        {product.is_on_sale && <span className="oil-sale-badge">عرض</span>}
        {product.image_url ? (
          <TransparentProductImage src={product.image_url} alt={product.name_ar} />
        ) : (
          <Package />
        )}
      </button>

      <div className="oil-product-body">
        <button type="button" className="oil-product-name" onClick={() => navigate(`/oils/product/${product.id}`)}>{product.name_ar}</button>
        <div className="oil-product-meta">
          <span>كود <b dir="ltr">{product.erp_item_code || product.sku}</b></span>
          <span>بارت <b dir="ltr">{product.part_number || "—"}</b></span>
        </div>

        <div className="oil-product-price-row">
          {canSeePrice ? (
            <div className="oil-product-price">
              <span className="oils-num">
                {fmt(product.price)} <span className="text-[10px] font-bold">ج.م</span>
              </span>
              {product.tierPrice && (
                <span className="oils-num oil-old-price">
                  {fmt(product.base_price)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] font-bold" style={{ color: "hsl(var(--oils-muted))" }}>سجّل دخولك لرؤية سعر الجملة</span>
          )}

          {/* الكمية */}
          <div className="oil-mini-stepper">
            <button
              type="button"
              aria-label="تقليل"
              onClick={() => { void haptic("light"); setQty((q) => Math.max(1, q - 1)); }}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="oils-num">{qty}</span>
            <button
              type="button"
              aria-label="زيادة"
              onClick={() => { void haptic("light"); setQty((q) => q + 1); }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="oil-product-actions">
          <div className="oil-product-badges">
            <TierPriceBadge product={product} />
            {nextDiscount && canSeePrice && (
              <span className="oils-chip oils-num">
                خصم عند {nextDiscount.min_quantity}+ قطعة
              </span>
            )}
            {outOfStock && (
              <span className="oils-chip oils-chip--danger">
                نافد حاليًا
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={outOfStock}
            className="oil-add-button"
            onClick={() => { void haptic("medium"); onAdd(product, qty); }}
          >
            <ShoppingBag />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default OilProductCard;
