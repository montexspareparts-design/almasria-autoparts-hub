import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useState } from "react";
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
  /** If provided, clicking a category calls this instead of navigating */
  onCategorySelect?: (categoryId: string) => void;
}

const CategoryBrowseSlider = ({ onCategorySelect }: CategoryBrowseSliderProps) => {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const [isHovered, setIsHovered] = useState(false);

  // Fetch categories + product counts from DB
  const { data: categoriesWithCounts } = useQuery({
    queryKey: ["category_browse_slider"],
    queryFn: async () => {
      // Get categories
      const { data: cats, error } = await supabase
        .from("product_categories")
        .select("id, name_ar, slug, sort_order")
        .order("sort_order");
      if (error) throw error;

      // Get counts per category (only active products with stock > 0)
      const counts = await Promise.all(
        (cats || []).map(async (cat) => {
          const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .gt("stock_quantity", 0)
            .eq("category_id", cat.id);
          return { ...cat, count: count ?? 0 };
        })
      );

      // Only show categories with products, sorted by count desc
      return counts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
    },
    staleTime: 5 * 60 * 1000,
  });



  const handleCategoryClick = (cat: { id: string; slug: string }) => {
    if (onCategorySelect) {
      onCategorySelect(cat.id);
    } else {
      // Navigate to products page with category filter (use current brand path if available)
      const currentPath = window.location.pathname;
      const brandMatch = currentPath.match(/\/products\/([^/]+)/);
      const targetPath = brandMatch ? `/products/${brandMatch[1]}` : "/products/toyota-genuine";
      navigate(`${targetPath}?category=${cat.slug}`);
    }
  };

  const items = categoriesWithCounts || [];
  if (items.length === 0) return null;

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
                searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => searchInput.focus(), 500);
              }
            }}
            className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-primary/15 border-2 border-primary/30 text-primary text-lg md:text-2xl font-black mb-4 hover:bg-primary/25 hover:scale-105 transition-all duration-300 cursor-pointer animate-[glowPulse_3s_ease-in-out_infinite]"
            style={{ animationName: "glowPulse" }}
          >
            <Search className="w-6 h-6 md:w-7 md:h-7" />
            بتدوّر على إيه؟
          </button>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            اختار الفئة اللي محتاجها وهنوصّلك للمنتج اللي بتدور عليه
          </p>
        </motion.div>

        {/* Marquee ticker */}
        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-[5] pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-[5] pointer-events-none" />

          <div
            className="flex w-max gap-4 py-2"
            style={{
              animation: `marquee-rtl ${items.length * 2.5}s linear infinite`,
            }}
          >
            {[...items, ...items].map((cat, i) => {
              const assets = categoryAssets[cat.slug] || { image: catFilters, accent: defaultAccent };
              return (
                <motion.div
                  key={`${cat.id}-${i}`}
                  whileHover={{ scale: 1.08, y: -6 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="shrink-0"
                >
                  <button
                    onClick={() => handleCategoryClick(cat)}
                    className="group/card block relative w-[120px] sm:w-[140px] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 text-right"
                  >
                    <div className="aspect-[4/3] bg-white p-2 relative overflow-hidden">
                      <motion.img
                        src={assets.image}
                        alt={cat.name_ar}
                        loading="lazy"
                        width={280}
                        height={210}
                        className="w-full h-full object-contain"
                        whileHover={{ scale: 1.15, rotate: 2 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className={`relative bg-gradient-to-br ${assets.accent} px-2.5 py-2 text-center overflow-hidden`}>
                      <div className="absolute inset-0 bg-white/0 group-hover/card:bg-white/10 transition-colors duration-300" />
                      <span className="relative text-white font-bold text-xs block leading-snug">{cat.name_ar}</span>
                      <span className="relative text-white/70 text-[10px] block">{cat.count} صنف</span>
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
