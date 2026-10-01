import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, Repeat2, ShieldCheck, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOilsCatalog } from "@/lib/oils/useOilsCatalog";
import { useReorder } from "@/lib/oils/useReorder";
import OilProductCard from "../components/OilProductCard";
import { useDealerCart } from "@/hooks/useDealerCart";
import { haptic } from "@/lib/haptics";
import OilsBrandMark from "../components/OilsBrandMark";
import { resolveAssetUrl } from "../components/TransparentProductImage";

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
    const available = products.filter((product) => product.stock_quantity > 0 && product.image_url);
    return [...available.filter((product) => product.is_on_sale), ...available.filter((product) => !product.is_on_sale)].slice(0, 8);
  }, [products]);
  const total = featuredProducts.length;
  // شريط متصل: الأصناف + نسخة من الأول في الآخر علشان اللفّ يبقى سلس من غير رجوع
  const slides = useMemo(() => (total > 1 ? [...featuredProducts, featuredProducts[0]] : featuredProducts), [featuredProducts, total]);
  const [paused, setPaused] = useState(false);
  const [instant, setInstant] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const activeDot = total ? featuredIndex % total : 0;

  const goTo = useCallback((next: number) => {
    if (total < 2) return;
    setInstant(false);
    setFeaturedIndex(next);
  }, [total]);

  useEffect(() => {
    if (total < 2 || reduceMotion || paused) return;
    const timer = window.setTimeout(() => goTo(featuredIndex + 1), 4500);
    return () => window.clearTimeout(timer);
  }, [total, reduceMotion, paused, featuredIndex, goTo]);

  useEffect(() => {
    if (featuredIndex > total) { setInstant(true); setFeaturedIndex(0); }
  }, [featuredIndex, total]);

  useEffect(() => {
    if (!instant) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
    return () => cancelAnimationFrame(id);
  }, [instant]);

  const onTrackTransitionEnd = () => {
    if (featuredIndex === total && total > 1) { setInstant(true); setFeaturedIndex(0); }
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    setPaused(false);
    if (start == null || total < 2) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) < 40) return;
    // RTL: السحب لليمين = الصنف التالي
    if (dx > 0) goTo(featuredIndex >= total ? 1 : featuredIndex + 1);
    else if (featuredIndex === 0) { setInstant(true); setFeaturedIndex(total); requestAnimationFrame(() => requestAnimationFrame(() => goTo(total - 1))); }
    else goTo(featuredIndex - 1);
  };

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

      {total > 0 ? (
        <section className="oils-featured-shell">
          <div className="oils-featured oils-showcase">
            <div className="oils-featured-copy">
              <span><Sparkles /> اختيار التجار المعتمد</span>
              <h2>أداء أصلي.<br /><em>ثقة في كل دورة.</em></h2>
            </div>

            <div
              className="oils-showcase-viewport"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onTouchCancel={() => setPaused(false)}
            >
              <div
                className="oils-showcase-track"
                style={{
                  transform: `translate3d(${featuredIndex * 100}%, 0, 0)`,
                  transition: instant || reduceMotion ? "none" : "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                onTransitionEnd={onTrackTransitionEnd}
              >
                {slides.map((p, i) => (
                  <article key={`${p.id}-${i}`} className="oils-showcase-slide" aria-hidden={i !== featuredIndex}>
                    <button type="button" className="oils-showcase-media" onClick={() => navigate(`/oils/product/${p.id}`)}>
                      <img src={resolveAssetUrl(p.image_url!)} alt={p.name_ar} loading="eager" decoding="async" draggable={false} />
                      <span className="oils-featured-seal"><ShieldCheck /> أصلي</span>
                    </button>
                    <div className="oils-showcase-card">
                      <button type="button" className="oils-showcase-info" onClick={() => navigate(`/oils/product/${p.id}`)}>
                        <h3>{p.name_ar}</h3>
                        <div className="oils-featured-codes">
                          <span>كود الصنف <b dir="ltr">{p.erp_item_code || p.sku}</b></span>
                          <span>بارت نمبر <b dir="ltr">{p.part_number || "—"}</b></span>
                        </div>
                        <div className="oils-featured-priceline">
                          <span className="oils-featured-pricelabel">سعرك</span>
                          <strong className="oils-num">{p.price.toLocaleString("en-US", { maximumFractionDigits: 0 })} <small>ج.م</small></strong>
                        </div>
                      </button>
                      <button type="button" className="oils-showcase-add" aria-label="أضف للسلة" onClick={() => { void haptic("light"); void handleAdd(p, Math.max(1, p.min_order_qty || 1)); }}>
                        <ShoppingBag strokeWidth={1.9} />
                        <span>أضف</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <button type="button" className="oils-featured-more" onClick={() => navigate("/oils/catalog")}><span>تصفّح كتالوج الزيوت</span><ChevronLeft /></button>

            {total > 1 && (
              <div className="oils-showcase-dots" aria-label={`الصنف ${activeDot + 1} من ${total}`}>
                {featuredProducts.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    aria-label={`عرض الصنف ${index + 1}`}
                    className={index === activeDot ? "is-active" : ""}
                    onClick={() => goTo(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : <div className="oils-skeleton oils-featured" style={{ height: 520 }} />}

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
