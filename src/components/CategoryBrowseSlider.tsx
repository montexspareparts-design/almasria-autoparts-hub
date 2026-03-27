import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { 
  Zap, Droplets, Settings, Car, Disc, Filter, Layers,
  Fuel, CircleDot, Wrench, Gauge
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const categories = [
  { name: "بوجيهات ومباين", icon: Zap, color: "from-amber-500 to-orange-500", search: "بوجيهات" },
  { name: "دورة تبريد مياه", icon: Droplets, color: "from-blue-500 to-cyan-500", search: "تبريد" },
  { name: "سيور وبلي", icon: Settings, color: "from-gray-600 to-gray-800", search: "سيور" },
  { name: "عفشة", icon: Car, color: "from-green-500 to-emerald-600", search: "عفشة" },
  { name: "دبرياج", icon: Disc, color: "from-red-500 to-rose-600", search: "دبرياج" },
  { name: "فلاتر", icon: Filter, color: "from-purple-500 to-violet-600", search: "فلتر" },
  { name: "فيبر", icon: Layers, color: "from-yellow-500 to-amber-600", search: "فيبر" },
  { name: "زيوت بنزين", icon: Fuel, color: "from-teal-500 to-teal-700", search: "زيت بنزين" },
  { name: "زيوت ديزل", icon: CircleDot, color: "from-slate-600 to-slate-800", search: "زيت ديزل" },
  { name: "زيوت فتيس", icon: Wrench, color: "from-indigo-500 to-indigo-700", search: "فتيس" },
  { name: "تيل فرامل", icon: Gauge, color: "from-pink-500 to-rose-600", search: "تيل فرامل" },
];

const CategoryBrowseSlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-3">
            <Search className="w-3.5 h-3.5" />
            بتدوّر على إيه؟
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
            تصفّح حسب <span className="text-primary">الفئة</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            اختار الفئة اللي محتاجها وهنوصّلك للمنتج اللي بتدور عليه
          </p>
        </motion.div>

        {/* Slider */}
        <div className="relative group">
          {/* Arrows */}
          {canScrollRight && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          {canScrollLeft && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}

          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory px-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="snap-start"
              >
                <Link
                  to={`/products/toyota-genuine?search=${encodeURIComponent(cat.search)}`}
                  className="group/card flex flex-col items-center gap-3 min-w-[120px] sm:min-w-[140px] p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg group-hover/card:scale-110 transition-transform duration-300`}>
                    <cat.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-foreground text-center whitespace-nowrap">
                    {cat.name}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover/card:text-primary group-hover/card:-translate-x-1 transition-all duration-300" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryBrowseSlider;
