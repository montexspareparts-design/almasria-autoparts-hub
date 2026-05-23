import { useState } from "react";
import { Cog, Disc, Droplets, Filter, Zap, Sparkles } from "lucide-react";
import FeaturedProducts from "@/components/FeaturedProducts";

type Cat = {
  key: string;
  label: string;
  icon: any;
  slugs: string[] | null; // null = all
};

const CATEGORIES: Cat[] = [
  { key: "all", label: "الكل", icon: Sparkles, slugs: null },
  { key: "engine", label: "محرك", icon: Cog, slugs: ["spark-plugs-coils", "belts-bearings", "gaskets", "oil-seals", "clutch", "water-cooling"] },
  { key: "brakes", label: "فرامل", icon: Disc, slugs: ["brakes"] },
  { key: "oils", label: "زيوت", icon: Droplets, slugs: ["oils-gasoline", "oils-diesel", "oils-transmission"] },
  { key: "filters", label: "فلاتر", icon: Filter, slugs: ["filters"] },
  { key: "electrical", label: "كهرباء", icon: Zap, slugs: ["electrical"] },
];

const PopularProductsSection = () => {
  const [active, setActive] = useState<string>("all");
  const current = CATEGORIES.find((c) => c.key === active) || CATEGORIES[0];

  return (
    <section className="relative bg-carbon py-20 md:py-24">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-14">
          <div className="inline-block px-3 py-1 rounded-full border border-white/10 mb-5">
            <span className="text-soft font-tajawal font-bold text-xs tracking-widest">
              متجر تويوتا الأصلي
            </span>
          </div>
          <h2
            className="font-tajawal font-black text-white leading-tight"
            style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}
          >
            أكثر القطع <span className="text-toyota-red">طلباً</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="h-[3px] w-20 bg-toyota-red rounded-full shadow-red-glow" />
          </div>
          <p className="font-tajawal text-soft text-base md:text-lg mt-4 max-w-xl mx-auto">
            مختارة بعناية من خبراء قطع الغيار — الأكثر طلباً من عملاء المصرية جروب.
          </p>
        </div>

        {/* Category chips — filter in place */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3 mb-10 md:mb-12">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isActive = c.key === active;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setActive(c.key)}
                className={`group inline-flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all ${
                  isActive
                    ? "bg-toyota-red border-toyota-red text-white shadow-lg shadow-toyota-red/30"
                    : "bg-surface border-white/10 text-white hover:border-toyota-red/60 hover:bg-toyota-red/10"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : "text-toyota-red"
                  }`}
                />
                <span className="font-tajawal font-bold text-sm">{c.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative rounded-3xl bg-gradient-to-b from-surface/60 to-carbon border border-white/5 overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top, hsl(353 92% 48% / 0.08), transparent 60%)",
            }}
          />
          <div className="relative">
            <FeaturedProducts categorySlugs={current.slugs ?? undefined} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularProductsSection;
