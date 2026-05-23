import { Link } from "react-router-dom";
import { Cog, Disc, Droplets, Filter, Zap } from "lucide-react";
import FeaturedProducts from "@/components/FeaturedProducts";

const CATEGORIES = [
  { label: "محرك", icon: Cog, href: "/parts-by-type/engine" },
  { label: "فرامل", icon: Disc, href: "/parts-by-type/brakes" },
  { label: "زيوت", icon: Droplets, href: "/parts-by-type/oils" },
  { label: "فلاتر", icon: Filter, href: "/parts-by-type/filters" },
  { label: "كهرباء", icon: Zap, href: "/parts-by-type/electrical" },
];

/**
 * Luxury dark wrapper around the existing FeaturedProducts grid.
 * Keeps all cart / pricing / B2B+B2C logic intact — only the surrounding
 * surface, heading, and category tabs are new (visual layer only).
 */
const PopularProductsSection = () => {
  return (
    <section className="relative bg-carbon py-20 md:py-24">
      {/* Top hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />

      <div className="container mx-auto px-4">
        {/* Heading */}
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

        {/* Category chips */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3 mb-10 md:mb-12">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                to={c.href}
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-white/10 hover:border-toyota-red/60 hover:bg-toyota-red/10 transition-all"
              >
                <Icon className="w-4 h-4 text-toyota-red group-hover:scale-110 transition-transform" />
                <span className="font-tajawal font-bold text-white text-sm">
                  {c.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Inner products grid (luxury surface card) */}
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
            <FeaturedProducts />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularProductsSection;
