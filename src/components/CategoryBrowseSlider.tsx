import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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

// Map category slugs to images and gradient accents
const categoryAssets: Record<string, { image: string; accent: string }> = {
  "spark-plugs-coils": { image: catSparkPlugs, accent: "from-amber-500/80 to-orange-600/90" },
  "water-cooling": { image: catCooling, accent: "from-blue-500/80 to-cyan-600/90" },
  "belts-bearings": { image: catBelts, accent: "from-gray-600/80 to-gray-800/90" },
  "suspension": { image: catSuspension, accent: "from-green-600/80 to-emerald-700/90" },
  "clutch": { image: catClutch, accent: "from-red-500/80 to-rose-700/90" },
  "filters": { image: catFilters, accent: "from-purple-500/80 to-violet-700/90" },
  "fiber-parts": { image: catBody, accent: "from-yellow-500/80 to-amber-600/90" },
  "bumpers": { image: catBumpers, accent: "from-stone-600/80 to-stone-800/90" },
  "oil-seals": { image: catOilSeals, accent: "from-orange-600/80 to-amber-800/90" },
  "lights": { image: catHeadlights, accent: "from-sky-500/80 to-blue-700/90" },
  "rubber": { image: catRubber, accent: "from-zinc-600/80 to-zinc-800/90" },
  "mirrors": { image: catMirrors, accent: "from-cyan-500/80 to-cyan-700/90" },
  "gaskets": { image: catGaskets, accent: "from-rose-500/80 to-red-700/90" },
  "shocks": { image: catShocks, accent: "from-emerald-500/80 to-green-700/90" },
  "electrical": { image: catDynamo, accent: "from-violet-500/80 to-purple-700/90" },
  "oils-gasoline": { image: catOilGasoline, accent: "from-teal-500/80 to-teal-700/90" },
  "oils-diesel": { image: catOilDiesel, accent: "from-slate-600/80 to-slate-800/90" },
  "oils-transmission": { image: catOilTransmission, accent: "from-indigo-500/80 to-indigo-700/90" },
  "brakes": { image: catBrakePads, accent: "from-pink-500/80 to-rose-700/90" },
  "steering": { image: catSuspension, accent: "from-teal-600/80 to-emerald-800/90" },
};

const defaultAccent = "from-primary/80 to-primary/90";

interface CategoryBrowseSliderProps {
  onCategorySelect?: (categoryId: string) => void;
}

const CategoryBrowseSlider = ({ onCategorySelect }: CategoryBrowseSliderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Fetch categories + product counts (all active products, not just in-stock — temp policy)
  const { data: categoriesWithCounts } = useQuery({
    queryKey: ["category_browse_slider_v2"],
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from("product_categories")
        .select("id, name_ar, slug, sort_order")
        .order("sort_order");
      if (error) throw error;

      // Count ALL active products per category (temp: ignore stock per policy)
      const counts = await Promise.all(
        (cats || []).map(async (cat) => {
          const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .eq("category_id", cat.id);
          return { ...cat, count: count ?? 0 };
        })
      );

      return counts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleCategoryClick = (cat: { id: string; slug: string }) => {
    if (onCategorySelect) {
      onCategorySelect(cat.id);
    } else {
      // Navigate to products page WITHOUT brand restriction — show all brands
      navigate(`/products/toyota-genuine?category=${cat.slug}&search=`);
    }
  };

  const items = categoriesWithCounts || [];

  // Scroll state management
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

  // Auto-scroll to start (RTL)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && items.length > 0) {
      el.scrollLeft = el.scrollWidth;
      setTimeout(updateScrollState, 100);
    }
  }, [items, updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -300 : 300;
    el.scrollBy({ left: amount, behavior: "smooth" });
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
              const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="ابحث"]');
              if (searchInput) {
                searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => searchInput.focus(), 500);
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
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors duration-200 opacity-0 group-hover:opacity-100"
              aria-label="Scroll left"
            >
              ‹
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors duration-200 opacity-0 group-hover:opacity-100"
              aria-label="Scroll right"
            >
              ›
            </button>
          )}

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-[5] pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-[5] pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            dir="rtl"
          >
            {items.map((cat) => {
              const assets = categoryAssets[cat.slug] || { image: catFilters, accent: defaultAccent };
              return (
                <motion.div
                  key={cat.id}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="shrink-0"
                >
                  <button
                    onClick={() => handleCategoryClick(cat)}
                    className="group/card block relative w-[130px] sm:w-[150px] rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 text-center border border-border/40 hover:border-primary/30"
                  >
                    <div className="aspect-[4/3] bg-white p-3 relative overflow-hidden">
                      <motion.img
                        src={assets.image}
                        alt={cat.name_ar}
                        loading="lazy"
                        width={280}
                        height={210}
                        className="w-full h-full object-contain"
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      />
                    </div>
                    <div className={`relative bg-gradient-to-br ${assets.accent} px-2.5 py-2.5 overflow-hidden`}>
                      <div className="absolute inset-0 bg-white/0 group-hover/card:bg-white/10 transition-colors duration-300" />
                      <span className="relative text-white font-bold text-xs block leading-snug">{cat.name_ar}</span>
                      <span className="relative text-white/80 text-[10px] block mt-0.5">{cat.count} صنف</span>
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
