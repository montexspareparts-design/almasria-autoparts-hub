import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, Droplets, Minus, Package, Plus, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useOilsCatalog } from "@/lib/oils/useOilsCatalog";
import { useDealerCart } from "@/hooks/useDealerCart";
import { haptic } from "@/lib/haptics";
import TransparentProductImage from "../components/TransparentProductImage";

const fmt = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 0 });

const OilsProductDetail = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { products, loading, discountsFor, priceAtQty } = useOilsCatalog();
  const { addItem } = useDealerCart();
  const product = products.find((item) => item.id === productId);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const discounts = useMemo(() => (product ? discountsFor(product) : []), [discountsFor, product]);

  if (loading) return <div className="oils-detail-skeleton oils-skeleton" />;

  if (!product) {
    return (
      <main className="oils-empty-screen" dir="rtl">
        <Package aria-hidden="true" />
        <h1>الصنف غير متاح</h1>
        <button type="button" className="oils-btn-primary" onClick={() => navigate("/oils/catalog")}>العودة للكتالوج</button>
      </main>
    );
  }

  const unitPrice = priceAtQty(product, qty);
  const outOfStock = product.stock_quantity <= 0;

  const handleAdd = async () => {
    if (outOfStock) return;
    await addItem(product.id, qty);
    void haptic("medium");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <main className="oils-product-detail" dir="rtl">
      <header className="oils-detail-topbar">
        <button type="button" className="oils-circle-button" aria-label="رجوع" onClick={() => navigate(-1)}>
          <ArrowRight />
        </button>
        <span className="oils-detail-brand">{product.brand || "ALMASRIA OILS"}</span>
        <button type="button" className="oils-circle-button oils-circle-button--dark" aria-label="السلة" onClick={() => navigate("/dealer?tab=cart")}>
          <ShoppingBag />
        </button>
      </header>

      <motion.section className="oils-detail-visual" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="oils-detail-halo" />
        {product.image_url ? (
          <TransparentProductImage src={product.image_url} alt={product.name_ar} className="oils-detail-image" />
        ) : (
          <div className="oils-detail-placeholder"><Droplets /></div>
        )}
        <div className="oils-detail-dots" aria-hidden="true"><i /><i /><i /></div>
      </motion.section>

      <motion.section className="oils-detail-sheet" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="oils-detail-status">
          <span className={outOfStock ? "is-out" : "is-in"}>{outOfStock ? "غير متاح حاليًا" : "متاح للتوريد"}</span>
          <span className="oils-num">المخزون {product.stock_quantity}</span>
        </div>
        <h1>{product.name_ar}</h1>
        <div className="oils-product-codes">
          <span>كود الصنف <b dir="ltr">{product.erp_item_code || product.sku}</b></span>
          <span>بارت نمبر <b dir="ltr">{product.part_number || "—"}</b></span>
        </div>

        {discounts.length > 0 && (
          <div className="oils-detail-discount">
            خصم كمية متاح من {discounts[0].min_quantity} قطعة
          </div>
        )}

        <div className="oils-detail-buyrow">
          <div className="oils-price-lockup">
            <strong className="oils-num">{fmt(unitPrice)}</strong><span>ج.م / قطعة</span>
          </div>
          <div className="oils-qty-control">
            <button type="button" aria-label="زيادة الكمية" onClick={() => setQty((value) => value + 1)}><Plus /></button>
            <b className="oils-num">{qty}</b>
            <button type="button" aria-label="تقليل الكمية" onClick={() => setQty((value) => Math.max(1, value - 1))}><Minus /></button>
          </div>
        </div>

        <button type="button" className="oils-detail-cta" disabled={outOfStock} onClick={() => void handleAdd()}>
          {added ? <><Check /> تمت الإضافة للسلة</> : <><ShoppingBag /> أضف للسلة — {fmt(unitPrice * qty)} ج.م</>}
        </button>
      </motion.section>
    </main>
  );
};

export default OilsProductDetail;