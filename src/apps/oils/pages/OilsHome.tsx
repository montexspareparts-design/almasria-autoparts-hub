import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, Droplets, Repeat2, ShoppingBag, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOilsCatalog } from "@/lib/oils/useOilsCatalog";
import { useReorder } from "@/lib/oils/useReorder";
import OilProductCard from "../components/OilProductCard";
import { useDealerCart } from "@/hooks/useDealerCart";
import { haptic } from "@/lib/haptics";
import OilsBrandMark from "../components/OilsBrandMark";

const OilsHome = () => {
  const navigate = useNavigate();
  const { profile, dealerAccount } = useAuth();
  const { products, loading, discountsFor, isDealer } = useOilsCatalog();
  const { lastOrder, lastOrderItems, reorder } = useReorder();
  const { addItem } = useDealerCart();

  const offers = useMemo(() => products.filter((p) => p.is_on_sale).slice(0, 6), [products]);
  const suggested = useMemo(
    () => products.filter((p) => p.stock_quantity > 0 && !p.is_on_sale).slice(0, 8),
    [products],
  );
  const featured = offers[0] || suggested[0] || products[0];

  const handleAdd = async (product: (typeof products)[number], qty: number) => {
    await addItem(product.id, qty);
  };

  return (
    <main className="oils-screen oils-home" dir="rtl">
      <header className="oils-page-header oils-home-header">
        <div className="oils-user-heading">
          <OilsBrandMark className="oils-logo-mark" />
          <div>
            <span className="oils-eyebrow">أهلًا بك</span>
            <h1>
              {profile?.full_name || "شريكنا في الجملة"}
            </h1>
          </div>
        </div>
        <button type="button" aria-label="الإشعارات" className="oils-circle-button" onClick={() => navigate("/oils/account")}>
          <Bell />
        </button>
      </header>

      {featured ? (
        <motion.section className="oils-featured" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <button type="button" className="oils-featured-copy" onClick={() => navigate(`/oils/product/${featured.id}`)}>
            <span><Sparkles /> اختيار التجار</span>
            <h2>زيوت موثوقة<br />لشغل يدوم</h2>
          </button>
          <button type="button" className="oils-featured-product" onClick={() => navigate(`/oils/product/${featured.id}`)}>
            {featured.image_url ? <img src={featured.image_url} alt={featured.name_ar} /> : <Droplets />}
          </button>
          <div className="oils-featured-card">
            <div><h3>{featured.name_ar}</h3><strong className="oils-num">{featured.price.toLocaleString("en-US", { maximumFractionDigits: 0 })} <small>ج.م</small></strong></div>
            <button type="button" aria-label="أضف للسلة" onClick={() => void handleAdd(featured, 1)}><ShoppingBag /></button>
          </div>
          <button type="button" className="oils-featured-more" onClick={() => navigate("/oils/catalog")}>تسوّق الكتالوج</button>
        </motion.section>
      ) : <div className="oils-skeleton oils-featured" />}

      {/* إعادة طلب */}
      {lastOrder && lastOrderItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="oils-reorder-strip">
          <div className="oils-reorder-icon"><Repeat2 /></div>
          <div className="oils-reorder-copy">
            <p>إعادة آخر طلبية</p>
            <span className="oils-num" dir="ltr">
              {lastOrder.order_number}
            </span>
          </div>
          <button
            type="button"
            className="oils-reorder-button"
            onClick={() => { void haptic("medium"); void reorder().then(() => navigate("/oils/quick")); }}
          >
            {lastOrderItems.length} أصناف <ChevronLeft />
          </button>
        </motion.div>
      )}

      <section className="oils-home-products">
        <div className="oils-section-title">
          <span>مختارة لنشاطك</span>
          <button type="button" onClick={() => navigate("/oils/catalog")}>
            الكل
          </button>
        </div>

        {loading ? (
          <div className="oils-product-grid">
            {[0, 1, 2].map((i) => <div key={i} className="oils-skeleton h-[130px]" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {suggested.map((p) => (
              <OilProductCard key={p.id} product={p} discounts={discountsFor(p)} canSeePrice={isDealer} onAdd={handleAdd} />
            ))}
            {suggested.length === 0 && (
              <p className="text-center text-[12px] py-8" style={{ color: "hsl(var(--oils-muted))" }}>
                لا توجد أصناف متاحة حاليًا.
              </p>
            )}
          </div>
        )}
      </section>

      {dealerAccount?.min_order_amount ? (
        <p className="text-[10.5px] text-center pb-2" style={{ color: "hsl(var(--oils-muted))" }}>
          الحد الأدنى للطلبية: {Number(dealerAccount.min_order_amount).toLocaleString("en-US")} ج.م
        </p>
      ) : null}
    </main>
  );
};

export default OilsHome;
