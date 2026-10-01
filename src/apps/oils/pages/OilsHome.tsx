import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, Droplets, Repeat2, ShieldCheck, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOilsCatalog } from "@/lib/oils/useOilsCatalog";
import { useReorder } from "@/lib/oils/useReorder";
import OilProductCard from "../components/OilProductCard";
import { useDealerCart } from "@/hooks/useDealerCart";
import { haptic } from "@/lib/haptics";
import OilsBrandMark from "../components/OilsBrandMark";
import TransparentProductImage from "../components/TransparentProductImage";

const OilsHome = () => {
  const navigate = useNavigate();
  const { profile, dealerAccount } = useAuth();
  const { products, loading, discountsFor, isDealer } = useOilsCatalog();
  const { lastOrder, lastOrderItems, reorder } = useReorder();
  const { addItem } = useDealerCart();
  const reduceMotion = useReducedMotion();
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const offers = useMemo(() => products.filter((p) => p.is_on_sale).slice(0, 6), [products]);
  const suggested = useMemo(
    () => products.filter((p) => p.stock_quantity > 0 && !p.is_on_sale).slice(0, 8),
    [products],
  );
  const featuredProducts = useMemo(() => {
    const available = products.filter((product) => product.stock_quantity > 0);
    return [...available.filter((product) => product.is_on_sale), ...available.filter((product) => !product.is_on_sale)];
  }, [products]);
  const featured = featuredProducts[featuredIndex] || featuredProducts[0] || products[0];

  const [paused, setPaused] = useState(false);

  // Preload all showcase images so a slide never appears empty
  useEffect(() => {
    featuredProducts.slice(0, 20).forEach((p) => {
      if (!p.image_url) return;
      const img = new Image();
      img.decoding = "async";
      img.src = p.image_url;
    });
  }, [featuredProducts]);

  useEffect(() => {
    if (featuredProducts.length < 2 || reduceMotion || paused) return;
    const timer = window.setTimeout(() => {
      setFeaturedIndex((current) => (current + 1) % featuredProducts.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [featuredProducts.length, reduceMotion, paused, featuredIndex]);

  useEffect(() => {
    if (featuredIndex >= featuredProducts.length) setFeaturedIndex(0);
  }, [featuredIndex, featuredProducts.length]);

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
        <button type="button" aria-label="الإشعارات" className="oils-circle-button" onClick={() => navigate("/oils/notifications")}>
          <Bell />
        </button>
      </header>

      <button type="button" className="oils-home-quick" onClick={() => navigate("/oils/quick")}><Zap /> طلب سريع بكود الصنف <ChevronLeft /></button>

      {featured ? (
        <section
          className="oils-featured-shell"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerCancel={() => setPaused(false)}
        >
          <motion.section
            className="oils-featured"
            drag={featuredProducts.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              const n = featuredProducts.length;
              if (Math.abs(info.offset.x) < 50) return;
              setFeaturedIndex((c) => (info.offset.x > 0 ? (c + 1) % n : (c - 1 + n) % n));
            }}
          >
            <button type="button" className="oils-featured-copy" onClick={() => navigate(`/oils/product/${featured.id}`)}>
              <span><Sparkles /> اختيار التجار المعتمد</span>
              <h2>أداء أصلي.<br /><em>ثقة في كل دورة.</em></h2>
            </button>
            <button type="button" className="oils-featured-product" onClick={() => navigate(`/oils/product/${featured.id}`)}>
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={featured.id}
                  className="oils-featured-media"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03, y: -6 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  {featured.image_url ? <TransparentProductImage src={featured.image_url} alt={featured.name_ar} /> : <Droplets />}
                </motion.div>
              </AnimatePresence>
              <span className="oils-featured-seal"><ShieldCheck /> أصلي</span>
            </button>
            <div className="oils-featured-card">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={featured.id}
                  className="oils-featured-card-copy"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  <h3>{featured.name_ar}</h3>
                  <div className="oils-featured-codes">
                    <span>كود الصنف <b dir="ltr">{featured.erp_item_code || featured.sku}</b></span>
                    <span>بارت نمبر <b dir="ltr">{featured.part_number || "—"}</b></span>
                  </div>
                  <div className="oils-featured-priceline">
                    <span className="oils-featured-pricelabel">سعرك</span>
                    <strong className="oils-num">{featured.price.toLocaleString("en-US", { maximumFractionDigits: 0 })} <small>ج.م</small></strong>
                  </div>
                </motion.div>
              </AnimatePresence>
              <button type="button" aria-label="أضف للسلة" onClick={() => void handleAdd(featured, 1)}>
                <ShoppingBag strokeWidth={1.9} />
                <span>أضف</span>
              </button>
            </div>
            <button type="button" className="oils-featured-more" onClick={() => navigate("/oils/catalog")}><span>تصفّح كتالوج الزيوت</span><ChevronLeft /></button>
          </motion.section>
          <div className="oils-featured-progress" aria-label={`الصنف ${featuredIndex + 1} من ${featuredProducts.length}`}>
            {featuredProducts.map((product, index) => (
              <button
                key={product.id}
                type="button"
                aria-label={`عرض الصنف ${index + 1}`}
                className={index === featuredIndex ? "is-active" : ""}
                onClick={() => setFeaturedIndex(index)}
              />
            ))}
          </div>
        </section>
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
