import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wrench, Building2, Lightbulb, Sparkles, ChevronLeft, 
  Droplets, Filter, Disc3, Battery, Settings, FileText, Users, TrendingUp
} from "lucide-react";

interface DealerBusinessBannerProps {
  businessType: string | null | undefined;
  dealerName: string;
  onNavigateToProduct?: (productId: string) => void;
}

// ─── Workshop Configuration ─────────────────────────────────
const WORKSHOP_CONFIG = {
  title: "مرحباً بمركز الصيانة",
  subtitle: "كل احتياجاتك من قطع الغيار الأصلية في مكان واحد",
  icon: Wrench,
  gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
  borderColor: "border-amber-500/30",
  badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  // Categories the workshop normally needs (slugs/keywords matched against product_categories.slug or name_ar)
  priorityCategories: ["filters", "oils", "brakes", "spark-plugs", "belts"],
  priorityKeywords: ["فلتر", "زيت", "فحمات", "شمعة", "سير", "بوجي"],
  tips: [
    {
      icon: Droplets,
      title: "تغيير الزيت",
      text: "غيّر زيت المحرك كل 5,000-10,000 كم حسب نوع الزيت. الزيت النظيف = محرك أطول عمراً."
    },
    {
      icon: Filter,
      title: "فلتر الهواء",
      text: "افحص فلتر الهواء كل 15,000 كم — فلتر متسخ = استهلاك بنزين أعلى بنسبة 10%."
    },
    {
      icon: Disc3,
      title: "الفحمات والأقراص",
      text: "افحص الفحمات كل 20,000 كم. الصوت الصرير عند الفرملة = استبدل فوراً قبل تلف الأقراص."
    },
    {
      icon: Battery,
      title: "البطارية",
      text: "نظّف أقطاب البطارية كل 6 شهور. عمرها الافتراضي 3-5 سنوات حسب الاستخدام."
    },
  ],
};

// ─── Corporate Configuration ─────────────────────────────────
const CORPORATE_CONFIG = {
  title: "حسابات الشركات والهيئات",
  subtitle: "حلول متكاملة لصيانة الأساطيل وإدارة المركبات",
  icon: Building2,
  gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
  borderColor: "border-blue-500/30",
  badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  priorityCategories: ["filters", "oils", "engine-parts", "transmission"],
  priorityKeywords: ["فلتر", "زيت", "محرك", "ناقل", "قير"],
  tips: [
    {
      icon: FileText,
      title: "كشف حساب شهري",
      text: "اطلب كشف حسابك الشهري من قسم 'كشف الحساب' لمتابعة جميع المعاملات بدقة."
    },
    {
      icon: Users,
      title: "طلبات جماعية",
      text: "استخدم 'طلب سريع' لرفع ملف Excel بكل احتياجات الأسطول دفعة واحدة — وفّر وقتك."
    },
    {
      icon: Settings,
      title: "صيانة دورية مجدولة",
      text: "خطّط لصيانة الأسطول كل 5,000 كم — فلاتر، زيوت، فحمات. اطلب الكميات مقدماً."
    },
    {
      icon: TrendingUp,
      title: "أسعار تفضيلية",
      text: "كحساب شركات، تحصل على أسعار الجملة + خصومات إضافية على الطلبات الكبيرة."
    },
  ],
};

const DealerBusinessBanner = ({ businessType, dealerName, onNavigateToProduct }: DealerBusinessBannerProps) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);

  // Only show this banner for workshop or corporate
  const config = useMemo(() => {
    if (businessType === "workshop") return WORKSHOP_CONFIG;
    if (businessType === "corporate") return CORPORATE_CONFIG;
    return null;
  }, [businessType]);

  // Rotate tips every 6s
  useEffect(() => {
    if (!config) return;
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % config.tips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [config]);

  // Fetch priority products for this business type
  useEffect(() => {
    if (!config) return;

    const fetchPriorityProducts = async () => {
      setLoading(true);
      try {
        // Build OR filter for priority keywords on name_ar
        const keywordFilters = config.priorityKeywords
          .map((kw) => `name_ar.ilike.%${kw}%`)
          .join(",");

        const { data } = await supabase
          .from("products")
          .select("id, name_ar, sku, image_url, brand, base_price, stock_quantity")
          .eq("is_active", true)
          .gt("stock_quantity", 0)
          .or(keywordFilters)
          .limit(8);

        setProducts(data || []);
      } catch (e) {
        console.error("Failed to fetch priority products:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPriorityProducts();
  }, [config, businessType]);

  if (!config) return null;

  const Icon = config.icon;
  const currentTip = config.tips[tipIndex];
  const TipIcon = currentTip.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* ═══ Hero Welcome Banner ═══ */}
      <Card className={`relative overflow-hidden border-2 ${config.borderColor} bg-gradient-to-l ${config.gradient}`}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`shrink-0 w-14 h-14 rounded-2xl ${config.badgeColor} border flex items-center justify-center`}>
              <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className={`${config.badgeColor} text-[10px] mb-2 font-bold`}>
                {businessType === "workshop" ? "🔧 خدمة مخصصة لمراكز الصيانة" : "🏢 خدمة مخصصة لحسابات الشركات"}
              </Badge>
              <h2 className="text-lg sm:text-xl font-black text-foreground">
                {config.title} — أهلاً {dealerName}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {config.subtitle}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Rotating Tip Card ═══ */}
      <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-card via-card to-muted/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-foreground">
              {businessType === "workshop" ? "نصيحة الصيانة اليومية" : "نصيحة إدارة الأسطول"}
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.35 }}
              className="flex items-start gap-3"
            >
              <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TipIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground mb-0.5">{currentTip.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{currentTip.text}</p>
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Tip indicators */}
          <div className="flex items-center gap-1.5 mt-3 justify-center">
            {config.tips.map((_, i) => (
              <button
                key={i}
                onClick={() => setTipIndex(i)}
                className={`h-1 rounded-full transition-all ${
                  i === tipIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
                aria-label={`نصيحة ${i + 1}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Priority Products Section ═══ */}
      {(loading || products.length > 0) && (
        <Card className="border border-border/50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {businessType === "workshop"
                    ? "أصناف أساسية للورش — الأكثر طلباً"
                    : "أصناف صيانة الأساطيل — مختارة لك"}
                </h3>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {products.slice(0, 8).map((p) => (
                  <motion.button
                    key={p.id}
                    onClick={() => onNavigateToProduct?.(p.id)}
                    whileHover={{ y: -2 }}
                    className="group relative overflow-hidden rounded-xl border border-border/60 bg-white hover:border-primary/40 hover:shadow-md transition-all text-right"
                  >
                    <div className="aspect-square bg-white p-2 flex items-center justify-center">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name_ar}
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-muted/40 flex items-center justify-center">
                          <Settings className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-border/40 bg-muted/20">
                      <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight min-h-[28px]">
                        {p.name_ar}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        {p.sku}
                      </p>
                    </div>
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <ChevronLeft className="w-3 h-3" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default DealerBusinessBanner;
