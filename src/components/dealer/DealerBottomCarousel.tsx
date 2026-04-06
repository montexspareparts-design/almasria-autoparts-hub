import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Award, Star, TrendingUp, FileText, Sparkles, Package } from "lucide-react";

/* ── Slide data types ── */
interface BannerSlide {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
  accentColor: string;
  action?: { label: string; onClick: () => void };
}

interface DealerBottomCarouselProps {
  onNavigateToPriceLists: () => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

const DealerBottomCarousel = ({ onNavigateToPriceLists }: DealerBottomCarouselProps) => {
  const { user } = useAuth();
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [current, setCurrent] = useState(0);

  // Build slides on mount
  useEffect(() => {
    const buildSlides = async () => {
      const result: BannerSlide[] = [];

      // 1 - Trust: موزع معتمد
      result.push({
        id: "trust-1",
        icon: <Shield className="w-5 h-5" />,
        title: "موزع معتمد رسمياً من تويوتا",
        subtitle: "ضمان أصالة 100% على جميع القطع والزيوت",
        gradient: "from-emerald-600 via-emerald-500 to-teal-500",
        accentColor: "bg-white/20",
      });

      // 2 - Experience
      result.push({
        id: "trust-2",
        icon: <Award className="w-5 h-5" />,
        title: "خبرة +25 سنة في سوق قطع الغيار",
        subtitle: "هدفنا مكسبك — أسعار تنافسية وتسليم سريع",
        gradient: "from-amber-600 via-amber-500 to-yellow-500",
        accentColor: "bg-white/20",
      });

      // 3 - Price list
      const { data: pl } = await supabase
        .from("price_lists")
        .select("title, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pl) {
        result.push({
          id: "price-list",
          icon: <FileText className="w-5 h-5" />,
          title: `كشف أسعار: ${pl.title}`,
          subtitle: `آخر تحديث ${new Date(pl.updated_at).toLocaleDateString("ar-EG")}`,
          gradient: "from-indigo-600 via-indigo-500 to-blue-500",
          accentColor: "bg-white/20",
          action: { label: "اطلع على الكشوفات", onClick: onNavigateToPriceLists },
        });
      }

      // 4 - New arrivals count
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gt("stock_quantity", 0);

      if (count && count > 0) {
        result.push({
          id: "new-arrivals",
          icon: <Sparkles className="w-5 h-5" />,
          title: `${count} صنف متوفر الآن`,
          subtitle: "ابحث عن القطعة اللي محتاجها وابدأ طلبيتك",
          gradient: "from-blue-600 via-blue-500 to-cyan-500",
          accentColor: "bg-white/20",
        });
      }

      // 5 - Competitive prices
      result.push({
        id: "trust-3",
        icon: <TrendingUp className="w-5 h-5" />,
        title: "أفضل أسعار الجملة في مصر",
        subtitle: "شبكة توزيع تغطي جميع المحافظات",
        gradient: "from-purple-600 via-purple-500 to-fuchsia-500",
        accentColor: "bg-white/20",
      });

      // 6 - Quality
      result.push({
        id: "trust-4",
        icon: <Star className="w-5 h-5" />,
        title: "جودة تويوتا الأصلية — بلا منافس",
        subtitle: "Toyota Genuine Parts • MTX Aftermarket",
        gradient: "from-rose-600 via-red-500 to-orange-500",
        accentColor: "bg-white/20",
      });

      setSlides(result);
      setCurrent(Math.floor(Math.random() * result.length));
    };
    buildSlides();
  }, [onNavigateToPriceLists]);

  // Auto-rotate
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <div className="mt-6">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mb-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="relative h-1 rounded-full overflow-hidden transition-all duration-500"
            style={{ width: i === current ? 24 : 6 }}
          >
            <div className="absolute inset-0 bg-muted-foreground/15 rounded-full" />
            {i === current && (
              <motion.div
                className="absolute inset-0 bg-primary rounded-full"
                layoutId="dot-active"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Banner strip */}
      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.5, ease }}
            className={`relative bg-gradient-to-l ${slide.gradient} p-4 sm:p-5`}
          >
            {/* Decorative circles */}
            <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-sm" />
            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/5 blur-sm" />
            <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-white/[0.03]" />

            <div className="relative flex items-center gap-3 sm:gap-4">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${slide.accentColor} backdrop-blur-sm flex items-center justify-center text-white shadow-lg shadow-black/10`}
              >
                {slide.icon}
              </motion.div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4, ease }}
                  className="text-sm sm:text-base font-black text-white leading-tight truncate"
                >
                  {slide.title}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4, ease }}
                  className="text-[11px] sm:text-xs text-white/75 mt-0.5 truncate font-medium"
                >
                  {slide.subtitle}
                </motion.p>
              </div>

              {/* Action button */}
              {slide.action && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  onClick={slide.action.onClick}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[11px] font-bold transition-colors border border-white/10"
                >
                  {slide.action.label}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DealerBottomCarousel;
