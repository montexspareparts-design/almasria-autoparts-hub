import { motion, useAnimation, useMotionValue } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import catSparkPlugs from "@/assets/categories/cat-spark-plugs.webp";
import catCooling from "@/assets/categories/cat-cooling.webp";
import catBelts from "@/assets/categories/cat-belts.webp";
import catSuspension from "@/assets/categories/cat-suspension.webp";
import catClutch from "@/assets/categories/cat-clutch.webp";
import catFilters from "@/assets/categories/cat-filters.webp";
import catBody from "@/assets/categories/cat-body.webp";
import catOilGasoline from "@/assets/categories/cat-oil-gasoline.webp";
import catOilDiesel from "@/assets/categories/cat-oil-diesel.webp";
import catOilTransmission from "@/assets/categories/cat-oil-transmission.webp";
import catBrakePads from "@/assets/categories/cat-brake-pads.webp";
import catHeadlights from "@/assets/categories/cat-headlights.webp";
import catOilSeals from "@/assets/categories/cat-oil-seals.webp";
import catBumpers from "@/assets/categories/cat-bumpers.webp";
import catRubber from "@/assets/categories/cat-rubber.webp";
import catShocks from "@/assets/categories/cat-shocks.webp";
import catMirrors from "@/assets/categories/cat-mirrors.webp";
import catGaskets from "@/assets/categories/cat-gaskets.webp";
import catDynamo from "@/assets/categories/cat-dynamo.webp";

// Map category slugs to visuals for the premium slider cards
const categoryAssets: Record<string, { image: string; accent: string; searchTerm: string }> = {
  "spark-plugs-coils": { image: catSparkPlugs, accent: "from-amber-500/80 to-orange-600/90", searchTerm: "بوجيه" },
  "water-cooling": { image: catCooling, accent: "from-blue-500/80 to-cyan-600/90", searchTerm: "تبريد" },
  "belts-bearings": { image: catBelts, accent: "from-gray-600/80 to-gray-800/90", searchTerm: "سير" },
  "suspension": { image: catSuspension, accent: "from-green-600/80 to-emerald-700/90", searchTerm: "عفشة" },
  "clutch": { image: catClutch, accent: "from-red-500/80 to-rose-700/90", searchTerm: "دبرياج" },
  "filters": { image: catFilters, accent: "from-purple-500/80 to-violet-700/90", searchTerm: "فلتر" },
  "fiber-parts": { image: catBody, accent: "from-yellow-500/80 to-amber-600/90", searchTerm: "فيبر" },
  "bumpers": { image: catBumpers, accent: "from-stone-600/80 to-stone-800/90", searchTerm: "صدام" },
  "oil-seals": { image: catOilSeals, accent: "from-orange-600/80 to-amber-800/90", searchTerm: "سيل" },
  "lights": { image: catHeadlights, accent: "from-sky-500/80 to-blue-700/90", searchTerm: "كشاف" },
  "rubber": { image: catRubber, accent: "from-zinc-600/80 to-zinc-800/90", searchTerm: "كاوتش" },
  "mirrors": { image: catMirrors, accent: "from-cyan-500/80 to-cyan-700/90", searchTerm: "مراية" },
  "gaskets": { image: catGaskets, accent: "from-rose-500/80 to-red-700/90", searchTerm: "جوان" },
  "shocks": { image: catShocks, accent: "from-emerald-500/80 to-green-700/90", searchTerm: "مساعد" },
  "electrical": { image: catDynamo, accent: "from-violet-500/80 to-purple-700/90", searchTerm: "دينامو" },
  "oils-gasoline": { image: catOilGasoline, accent: "from-teal-500/80 to-teal-700/90", searchTerm: "زيت بنزين" },
  "oils-diesel": { image: catOilDiesel, accent: "from-slate-600/80 to-slate-800/90", searchTerm: "زيت ديزل" },
  "oils-transmission": { image: catOilTransmission, accent: "from-indigo-500/80 to-indigo-700/90", searchTerm: "زيت فتيس" },
  "brakes": { image: catBrakePads, accent: "from-pink-500/80 to-rose-700/90", searchTerm: "فرامل" },
  "steering": { image: catSuspension, accent: "from-teal-600/80 to-emerald-800/90", searchTerm: "مقود" },
};

const defaultAccent = "from-primary/80 to-primary/90";

interface CategoryBrowseSliderProps {
  onCategorySelect?: (categoryId: string, categoryName: string) => void;
  activeCategoryId?: string | null;
  pendingCategoryId?: string | null;
}

const CategoryBrowseSlider = ({ onCategorySelect, activeCategoryId, pendingCategoryId }: CategoryBrowseSliderProps) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const { data: categoriesWithCounts } = useQuery({
    queryKey: ["category_browse_slider_v5"],
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from("product_categories")
        .select("id, name_ar, slug, sort_order")
        .order("sort_order");
      if (error) throw error;

      // Single query to get counts instead of N+1
      const { data: countData } = await supabase
        .from("products")
        .select("category_id")
        .eq("is_active", true)
        .not("category_id", "is", null);

      const countMap = new Map<string, number>();
      (countData || []).forEach((p) => {
        if (p.category_id) {
          countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
        }
      });

      const counts = (cats || []).map((cat) => ({
        ...cat,
        count: countMap.get(cat.id) || 0,
      }));

      return counts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleCategoryClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    cat: { id: string; slug: string; name_ar: string }
  ) => {
    // Prevent any unintended default/bubbling behavior (e.g. parent links/forms)
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) return;

    if (onCategorySelect) {
      onCategorySelect(cat.id, cat.name_ar);
    } else {
      navigate(`/products?category=${encodeURIComponent(cat.slug)}`);
    }
  };

  const items = categoriesWithCounts || [];

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [items, updateScrollState]);

  // RTL: scroll to end on load
  useEffect(() => {
    const el = scrollRef.current;
    if (el && items.length > 0) {
      el.scrollLeft = el.scrollWidth;
      setTimeout(updateScrollState, 100);
    }
  }, [items, updateScrollState]);

  // Continuous smooth auto-scroll (drift) — pauses on hover/touch/focus
  const rafRef = useRef<number | null>(null);
  const pauseAutoScroll = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;

    const SPEED_PX_PER_SEC = 35; // smooth professional drift
    let lastTs = performance.now();
    let acc = 0; // accumulator for sub-pixel movement

    const tick = (ts: number) => {
      const dt = ts - lastTs;
      lastTs = ts;
      if (!pauseAutoScroll.current && el.scrollWidth > el.clientWidth) {
        acc += (SPEED_PX_PER_SEC * dt) / 1000;
        if (acc >= 1) {
          const step = Math.floor(acc);
          acc -= step;
          const maxScroll = el.scrollWidth - el.clientWidth;
          // RTL: drift from right (max) to left (0), then loop
          if (el.scrollLeft <= 1) {
            el.scrollLeft = maxScroll;
          } else {
            el.scrollLeft = Math.max(0, el.scrollLeft - step);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const pause = () => { pauseAutoScroll.current = true; };
    const resume = () => { pauseAutoScroll.current = false; };
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
    };
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -280 : 280;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Mouse drag scrolling
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(false);
    dragStartX.current = e.clientX;
    scrollStartX.current = el.scrollLeft;

    const handleMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientX - dragStartX.current;
      if (Math.abs(diff) > 5) setIsDragging(true);
      el.scrollLeft = scrollStartX.current - diff;
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setTimeout(() => setIsDragging(false), 50);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (items.length === 0) return null;

  return (
    <section className="py-8 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <button
            onClick={() => {
              // Try multiple selectors — placeholder may be animating, so don't rely on it
              const searchInput =
                document.querySelector<HTMLInputElement>('input[name="product-search"]') ||
                document.querySelector<HTMLInputElement>('input[type="search"]') ||
                document.querySelector<HTMLInputElement>('input[aria-label*="بحث"]') ||
                document.querySelector<HTMLInputElement>('input[placeholder*="ابحث"]') ||
                // Fallback: first text input inside the products listing area
                document.querySelector<HTMLInputElement>('main input[type="text"], section input[type="text"]');

              if (searchInput) {
                searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                  searchInput.focus({ preventScroll: true });
                  searchInput.click();
                }, 450);
              } else {
                // Last resort: scroll to category strip below
                const strip = document.getElementById("category-browse-strip");
                strip?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-base md:text-lg font-bold mb-3 hover:bg-primary/20 hover:scale-[1.03] transition-all duration-300 cursor-pointer"
          >
            <Search className="w-5 h-5" />
            بتدوّر على إيه؟
          </button>
          <p className="text-muted-foreground text-xs max-w-sm mx-auto">
            اختار الفئة وهنوصّلك للمنتج اللي بتدور عليه
          </p>
        </motion.div>

        {/* Scrollable category strip */}
        <div className="relative group">
          {/* Scroll arrows */}
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/95 border border-border shadow-xl flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          )}
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/95 border border-border shadow-xl flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent z-[5] pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-[5] pointer-events-none" />

          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            className="flex gap-3 overflow-x-auto scrollbar-hide py-3 px-2 cursor-grab active:cursor-grabbing select-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            dir="rtl"
          >
            {items.map((cat, index) => {
              const assets = categoryAssets[cat.slug] || { image: catFilters, accent: defaultAccent, searchTerm: cat.name_ar };
              const isActive = activeCategoryId === cat.id;
              const isPending = pendingCategoryId === cat.id;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 20 }}
                  whileHover={{ scale: 1.07, y: -6 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isActive ? { scale: 1.06, y: -4 } : { scale: 1, y: 0 }}
                  className="shrink-0"
                >
                  <button
                    type="button"
                    onClick={(e) => handleCategoryClick(e, cat)}
                    aria-pressed={isActive}
                    aria-busy={isPending}
                    disabled={isPending}
                    className={`group/card block relative w-[68px] sm:w-[145px] rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 text-center ${
                      isActive
                        ? "border-2 border-primary ring-2 ring-primary/40 shadow-primary/30 shadow-2xl"
                        : "border border-border/40 hover:border-primary/40"
                    }`}
                  >
                    {/* Loading overlay while filter is being applied */}
                    {isPending && (
                      <div className="absolute inset-0 z-30 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
                        <Loader2 className="w-5 h-5 sm:w-7 sm:h-7 text-primary animate-spin" />
                      </div>
                    )}
                    {/* Active checkmark badge — top-right */}
                    {isActive && !isPending && (
                      <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-20 w-[18px] h-[18px] sm:w-[24px] sm:h-[24px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-2 ring-white">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {/* Bold dynamic count badge — top-left corner */}
                    <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 z-10 min-w-[18px] sm:min-w-[28px] h-[18px] sm:h-[28px] px-1 sm:px-1.5 rounded-full bg-primary text-primary-foreground text-[9px] sm:text-xs font-extrabold flex items-center justify-center shadow-lg ring-1 sm:ring-2 ring-white/90">
                      {cat.count}
                    </div>
                    <div className="aspect-square sm:aspect-[4/3] bg-white p-1 sm:p-3 relative overflow-hidden">
                      <motion.img
                        src={assets.image}
                        alt={cat.name_ar}
                        loading="lazy"
                        width={280}
                        height={210}
                        className="w-full h-full object-contain drop-shadow-sm"
                        whileHover={{ scale: 1.12, rotate: 2 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      />
                      {/* Shine overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </div>
                    <div className={`relative bg-gradient-to-br ${assets.accent} px-1 py-1 sm:px-2.5 sm:py-2.5 overflow-hidden`}>
                      <div className={`absolute inset-0 transition-colors duration-300 ${isActive ? "bg-white/15" : "bg-white/0 group-hover/card:bg-white/10"}`} />
                      <span className="relative text-white font-bold text-[9px] sm:text-xs block leading-tight sm:leading-snug drop-shadow-sm truncate">{cat.name_ar}</span>
                      <span className="relative text-white/80 text-[7px] sm:text-[10px] block mt-0.5 font-semibold">{cat.count} صنف</span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryBrowseSlider;
