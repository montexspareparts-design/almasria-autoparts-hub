import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Award, Star, TrendingUp, Package, FileText, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlideProps {
  children: React.ReactNode;
}

const Slide = ({ children }: SlideProps) => (
  <div className="w-full min-h-[140px] sm:min-h-[160px]">{children}</div>
);

/* ── Slide 1: وصل حديثاً ── */
const NewArrivalsSlide = () => {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, image_url, stock_quantity")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setProducts(data);
    })();
  }, []);

  if (products.length === 0) return null;

  return (
    <Slide>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-bold text-foreground">وصل حديثاً</h3>
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {products.map(p => (
          <div key={p.id} className="shrink-0 w-[100px] bg-card border border-border/30 rounded-xl p-2 text-center hover:border-primary/30 transition-colors">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name_ar} className="w-12 h-12 mx-auto object-contain mb-1.5" loading="lazy" />
            ) : (
              <div className="w-12 h-12 mx-auto mb-1.5 bg-muted/30 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground/20" />
              </div>
            )}
            <p className="text-[10px] font-bold text-foreground line-clamp-1">{p.name_ar}</p>
            <p className="text-[9px] text-muted-foreground font-mono mt-0.5" dir="ltr">{p.sku}</p>
          </div>
        ))}
      </div>
    </Slide>
  );
};

/* ── Slide 2: شعارات الثقة ── */
const TrustSlide = () => {
  const badges = [
    { icon: Shield, label: "موزع معتمد رسمياً", sub: "Toyota Genuine Parts", color: "from-emerald-500/15 to-emerald-600/5", text: "text-emerald-700" },
    { icon: Award, label: "ضمان أصالة 100%", sub: "هدفنا مكسبك", color: "from-amber-500/15 to-amber-600/5", text: "text-amber-700" },
    { icon: Star, label: "خبرة +25 سنة", sub: "منذ 1999", color: "from-blue-500/15 to-blue-600/5", text: "text-blue-700" },
    { icon: TrendingUp, label: "أسعار تنافسية", sub: "أفضل سعر مضمون", color: "from-purple-500/15 to-purple-600/5", text: "text-purple-700" },
  ];

  return (
    <Slide>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 flex items-center justify-center">
          <Award className="w-4 h-4 text-amber-600" />
        </div>
        <h3 className="text-sm font-bold text-foreground">لماذا المصرية جروب؟</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {badges.map((b, i) => (
          <div key={i} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-br ${b.color} border border-border/20`}>
            <b.icon className={`w-6 h-6 ${b.text}`} />
            <p className="text-[11px] font-bold text-foreground text-center">{b.label}</p>
            <p className="text-[9px] text-muted-foreground text-center">{b.sub}</p>
          </div>
        ))}
      </div>
    </Slide>
  );
};

/* ── Slide 3: كشف الأسعار الأخير ── */
const PriceListSlide = ({ onNavigate }: { onNavigate: () => void }) => {
  const [latestPL, setLatestPL] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("price_lists")
        .select("id, title, version, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setLatestPL(data);
    })();
  }, []);

  if (!latestPL) return null;

  return (
    <Slide>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/15 to-indigo-600/5 flex items-center justify-center">
          <FileText className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-bold text-foreground">آخر كشف أسعار</h3>
      </div>
      <div className="bg-gradient-to-l from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200/30 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-foreground">{latestPL.title}</p>
          {latestPL.version && <p className="text-xs text-muted-foreground mt-0.5">الإصدار: {latestPL.version}</p>}
          <p className="text-[10px] text-muted-foreground mt-1">
            آخر تحديث: {new Date(latestPL.updated_at).toLocaleDateString("ar-EG")}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onNavigate} className="shrink-0 gap-1.5 text-xs rounded-xl">
          <FileText className="w-3.5 h-3.5" />
          اطلع على الكشوفات
        </Button>
      </div>
    </Slide>
  );
};

/* ── Slide 4: اشتريته من قبل ── */
const PreviouslyPurchasedSlide = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["delivered", "processing", "shipped", "ready"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (!orders?.length) return;

      const { data: items } = await supabase
        .from("order_items")
        .select("product_id")
        .in("order_id", orders.map(o => o.id));

      if (!items?.length) return;

      const uniqueIds = [...new Set(items.map(i => i.product_id))].slice(0, 5);
      const { data: prods } = await supabase
        .from("products")
        .select("id, name_ar, sku, image_url")
        .in("id", uniqueIds)
        .eq("is_active", true);

      if (prods) setProducts(prods);
    })();
  }, [user]);

  if (products.length === 0) return null;

  return (
    <Slide>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 flex items-center justify-center">
          <Package className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-foreground">اشتريته من قبل</h3>
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {products.map(p => (
          <div key={p.id} className="shrink-0 w-[100px] bg-card border border-border/30 rounded-xl p-2 text-center hover:border-emerald-400/30 transition-colors">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name_ar} className="w-12 h-12 mx-auto object-contain mb-1.5" loading="lazy" />
            ) : (
              <div className="w-12 h-12 mx-auto mb-1.5 bg-muted/30 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground/20" />
              </div>
            )}
            <p className="text-[10px] font-bold text-foreground line-clamp-1">{p.name_ar}</p>
            <p className="text-[9px] text-muted-foreground font-mono mt-0.5" dir="ltr">{p.sku}</p>
          </div>
        ))}
      </div>
    </Slide>
  );
};

/* ── Main Carousel ── */
interface DealerBottomCarouselProps {
  onNavigateToPriceLists: () => void;
}

const DealerBottomCarousel = ({ onNavigateToPriceLists }: DealerBottomCarouselProps) => {
  const slides = [
    <NewArrivalsSlide key="new" />,
    <TrustSlide key="trust" />,
    <PriceListSlide key="pl" onNavigate={onNavigateToPriceLists} />,
    <PreviouslyPurchasedSlide key="prev" />,
  ];

  // Randomize starting slide on each mount
  const [current, setCurrent] = useState(() => Math.floor(Math.random() * slides.length));

  // Auto-rotate every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), [slides.length]);
  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), [slides.length]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="relative mt-6"
    >
      {/* Dots + arrows */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={prev} className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={next} className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="overflow-hidden rounded-2xl bg-card/50 border border-border/30 p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {slides[current]}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
};

export default DealerBottomCarousel;
