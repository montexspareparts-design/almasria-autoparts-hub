import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown, Search } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import catSparkPlugs from "@/assets/categories/cat-spark-plugs.jpg";
import catCooling from "@/assets/categories/cat-cooling.jpg";
import catBelts from "@/assets/categories/cat-belts.jpg";
import catSuspension from "@/assets/categories/cat-suspension.jpg";
import catClutch from "@/assets/categories/cat-clutch.jpg";
import catFilters from "@/assets/categories/cat-filters.jpg";
import catBody from "@/assets/categories/cat-body.jpg";
import catOilGasoline from "@/assets/categories/cat-oil-gasoline.jpg";
import catOilDiesel from "@/assets/categories/cat-oil-diesel.jpg";
import catOilTransmission from "@/assets/categories/cat-oil-transmission.jpg";
import catBrakePads from "@/assets/categories/cat-brake-pads.jpg";
import catHeadlights from "@/assets/categories/cat-headlights.jpg";
import catOilSeals from "@/assets/categories/cat-oil-seals.jpg";
import catBumpers from "@/assets/categories/cat-bumpers.jpg";
import catRubber from "@/assets/categories/cat-rubber.jpg";
import catShocks from "@/assets/categories/cat-shocks.jpg";
import catMirrors from "@/assets/categories/cat-mirrors.jpg";
import catGaskets from "@/assets/categories/cat-gaskets.jpg";
import catDynamo from "@/assets/categories/cat-dynamo.jpg";

const categories = [
  { name: "بوجيهات ومباين", image: catSparkPlugs, search: "بوجي", accent: "from-amber-500/80 to-orange-600/90", brand: "toyota-genuine" },
  { name: "دورة تبريد مياه", image: catCooling, search: "مياه", accent: "from-blue-500/80 to-cyan-600/90", brand: "toyota-genuine" },
  { name: "سيور وبلي", image: catBelts, search: "سير", accent: "from-gray-600/80 to-gray-800/90", brand: "toyota-genuine" },
  { name: "عفشة", image: catSuspension, search: "مقص", accent: "from-green-600/80 to-emerald-700/90", brand: "toyota-genuine" },
  { name: "دبرياج", image: catClutch, search: "دبرياج", accent: "from-red-500/80 to-rose-700/90", brand: "toyota-genuine" },
  { name: "فلاتر", image: catFilters, search: "فلتر", accent: "from-purple-500/80 to-violet-700/90", brand: "toyota-genuine" },
  { name: "فيبر", image: catBody, search: "فيبر", accent: "from-yellow-500/80 to-amber-600/90", brand: "toyota-genuine" },
  { name: "اكصدامات", image: catBumpers, search: "اكصدام", accent: "from-stone-600/80 to-stone-800/90", brand: "toyota-genuine" },
  { name: "اويل سيل", image: catOilSeals, search: "اويل سيل", accent: "from-orange-600/80 to-amber-800/90", brand: "toyota-genuine" },
  { name: "كشافات", image: catHeadlights, search: "كشاف", accent: "from-sky-500/80 to-blue-700/90", brand: "toyota-genuine" },
  { name: "كاوتشات", image: catRubber, search: "كاوتش", accent: "from-zinc-600/80 to-zinc-800/90", brand: "toyota-genuine" },
  { name: "مرايات", image: catMirrors, search: "مراي", accent: "from-cyan-500/80 to-cyan-700/90", brand: "toyota-genuine" },
  { name: "جوانات", image: catGaskets, search: "جوان", accent: "from-rose-500/80 to-red-700/90", brand: "toyota-genuine" },
  { name: "مساعدين", image: catShocks, search: "مساعد", accent: "from-emerald-500/80 to-green-700/90", brand: "toyota-genuine" },
  { name: "دينامو", image: catDynamo, search: "دينامو", accent: "from-violet-500/80 to-purple-700/90", brand: "toyota-genuine" },
  { name: "زيوت بنزين", image: catOilGasoline, search: "زيت محرك بنزين", accent: "from-teal-500/80 to-teal-700/90", brand: "toyota-oils" },
  { name: "زيوت ديزل", image: catOilDiesel, search: "زيت محرك ديزل", accent: "from-slate-600/80 to-slate-800/90", brand: "toyota-oils" },
  { name: "زيوت فتيس", image: catOilTransmission, search: "زيت فتيس", accent: "from-indigo-500/80 to-indigo-700/90", brand: "toyota-oils" },
  { name: "تيل فرامل", image: catBrakePads, search: "طقم تيل", accent: "from-pink-500/80 to-rose-700/90", brand: "fbk" },
];

const CategoryBrowseSlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isHovered, setIsHovered] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("name_ar")
        .eq("is_active", true);
      if (error || !data) return;

      const counts: Record<string, number> = {};
      categories.forEach((cat) => {
        counts[cat.search] = data.filter((p) =>
          p.name_ar.includes(cat.search)
        ).length;
      });
      setCategoryCounts(counts);
    };
    fetchCounts();
  }, []);

  // Smooth continuous auto-scroll (marquee-style)
  const rafRef = useRef<number>(0);
  const speedRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const targetSpeed = 1.2; // pixels per frame

  useEffect(() => {
    if (!scrollRef.current) return;
    let lastTime = 0;

    const animate = (time: number) => {
      if (!scrollRef.current) return;
      const delta = lastTime ? (time - lastTime) : 16;
      lastTime = time;

      // Ease speed in/out based on hover or manual pause
      const paused = isHovered || Date.now() < pauseUntilRef.current;
      const target = paused ? 0 : targetSpeed;
      speedRef.current += (target - speedRef.current) * 0.08;

      if (Math.abs(speedRef.current) > 0.01) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        // RTL: scroll negatively
        if (scrollLeft <= -(scrollWidth - clientWidth) + 5) {
          scrollRef.current.scrollLeft = 0;
        } else {
          scrollRef.current.scrollLeft -= speedRef.current * (delta / 16);
        }
        checkScroll();
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isHovered]);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const absScroll = Math.abs(scrollLeft);
    const maxScroll = scrollWidth - clientWidth;
    setCanScrollRight(absScroll > 10);
    setCanScrollLeft(absScroll < maxScroll - 10);
    // Update progress (0 to 1)
    setScrollProgress(maxScroll > 0 ? absScroll / maxScroll : 0);
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    pauseUntilRef.current = Date.now() + 1500; // pause auto-scroll for 1.5s
    scrollRef.current.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
    setTimeout(checkScroll, 400);
  };

  return (
    <section className="py-14 bg-gradient-to-b from-background to-muted/40">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <button
            onClick={() => {
              const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="ابحث"]');
              if (searchInput) {
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => searchInput.focus(), 500);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold mb-4 hover:bg-primary/25 transition-colors cursor-pointer animate-[glowPulse_3s_ease-in-out_infinite]"
            style={{
              animationName: 'glowPulse',
            }}
          >
            <Search className="w-3.5 h-3.5" />
            بتدوّر على إيه؟
          </button>
          <h2 className="text-2xl md:text-4xl font-black text-foreground mb-3">
            تصفّح حسب <span className="text-primary">الفئة</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            اختار الفئة اللي محتاجها وهنوصّلك للمنتج اللي بتدور عليه
          </p>
        </motion.div>

        {/* Slider */}
        <div className="relative group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-[5] pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-[5] pointer-events-none" />

          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {[...categories].filter((cat) => (categoryCounts[cat.search] ?? 0) > 0).sort((a, b) => (categoryCounts[b.search] ?? 0) - (categoryCounts[a.search] ?? 0)).map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 25, scale: 0.92 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 120, damping: 14 }}
                className="snap-start"
              >
                <Link
                  to={`/products/${cat.brand}?search=${encodeURIComponent(cat.search)}`}
                  className="group/card block relative min-w-[150px] sm:min-w-[170px] rounded-2xl overflow-hidden shadow-md hover:shadow-[0_0_20px_hsl(var(--primary)/0.35),0_15px_35px_hsl(0_0%_0%/0.15)] transition-all duration-400"
                >
                  <motion.div
                    whileHover={{ y: -10, scale: 1.05, rotateZ: -1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 18 }}
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-white p-3 relative overflow-hidden">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
                        width={512}
                        height={512}
                        className="w-full h-full object-contain group-hover/card:scale-115 transition-transform duration-400 ease-out"
                      />
                      {/* Shimmer overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/card:translate-x-full transition-transform duration-500 ease-in-out" />
                      <div className="absolute inset-0 bg-primary/0 group-hover/card:bg-primary/5 transition-colors duration-200" />
                    </div>

                    {/* Label */}
                    <div className={`relative bg-gradient-to-br ${cat.accent} px-4 py-3.5 text-center`}>
                      <span className="text-white font-bold text-sm block leading-snug">
                        {cat.name}
                      </span>
                      <span className="text-white/70 text-[11px] block mt-0.5">
                        {categoryCounts[cat.search] !== undefined
                          ? `${categoryCounts[cat.search]} صنف`
                          : "..."}
                      </span>
                      <ChevronLeft className="w-4 h-4 text-white/70 mx-auto mt-1 group-hover/card:text-white group-hover/card:-translate-x-1.5 transition-all duration-250" />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Progress bar + navigation */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  Math.round(scrollProgress * 4) === i
                    ? "w-6 h-2 bg-primary"
                    : "w-2 h-2 bg-muted-foreground/25"
                }`}
                layout
              />
            ))}
          </div>

          {/* Arrow buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scroll("right")}
              disabled={!canScrollLeft}
              className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-default transition-all duration-300"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scroll("left")}
              disabled={!canScrollRight}
              className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-default transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryBrowseSlider;
