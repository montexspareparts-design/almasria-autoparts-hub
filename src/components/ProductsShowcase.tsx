import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";

// Brand logos
import brandGenuine from "@/assets/brand-genuine-parts.webp";
import brandOil from "@/assets/brand-toyota-oil.webp";
import brandMtx from "@/assets/brand-mtx.webp";
import brandDenso from "@/assets/brand-denso.webp";
import brandAisin from "@/assets/brand-aisin.webp";

const brands = [
  { id: "toyota_genuine", nameAr: "قطع غيار تويوتا الأصلية", nameEn: "Toyota Genuine Parts", code: "OEM", logo: brandGenuine, href: "/products/toyota-genuine", scale: 1 },
  { id: "toyota_oils", nameAr: "زيوت تويوتا الأصلية", nameEn: "Toyota Genuine Lubricants", code: "LUBE", logo: brandOil, href: "/products/toyota-oils", scale: 1.5 },
  { id: "mtx_aftermarket", nameAr: "MTX Aftermarket", nameEn: "MTX Aftermarket", code: "MTX", logo: brandMtx, href: "/products/mtx-aftermarket", scale: 1.5 },
  { id: "denso", nameAr: "دينسو", nameEn: "DENSO", code: "DNS", logo: brandDenso, href: "/products/denso", scale: 1 },
  { id: "aisin", nameAr: "أيسن", nameEn: "AISIN", code: "ASN", logo: brandAisin, href: "/products/aisin", scale: 1 },
];

const ProductsShowcase = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        left: `${(i * 67) % 100}%`,
        delay: `${(i * 0.9) % 12}s`,
        duration: `${11 + ((i * 1.7) % 9)}s`,
        size: 2 + (i % 3),
      })),
    []
  );

  return (
    <section
      id="products"
      className="relative w-full bg-carbon overflow-hidden py-20 md:py-28"
      aria-label="منتجاتنا"
    >
      {/* Animated grid */}
      <div aria-hidden className="absolute inset-0 lux-grid-bg animate-lux-grid-pan opacity-50" />

      {/* Ambient red gradient */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, hsl(353 92% 48% / 0.18) 0%, transparent 60%)",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, hsl(0 0% 0% / 0.7) 100%)",
        }}
      />

      {/* Floating particles */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full bg-toyota-red"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animation: `lux-particle ${p.duration} linear ${p.delay} infinite`,
              boxShadow: "0 0 8px hsl(var(--toyota-red) / 0.8)",
            }}
          />
        ))}
      </div>

      {/* Top & bottom red hairlines */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-70" />
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-70" />

      {/* Corner brackets */}
      <div aria-hidden className="pointer-events-none absolute inset-6 md:inset-10 z-20">
        <span className="absolute top-0 left-0 w-6 h-6 border-t border-l border-[hsl(var(--gold)/0.55)]" />
        <span className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[hsl(var(--gold)/0.55)]" />
        <span className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[hsl(var(--gold)/0.55)]" />
        <span className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[hsl(var(--gold)/0.55)]" />
      </div>

      {/* Marquee backdrop */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute top-1/2 left-1/2 w-[260vw] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap animate-lux-marquee"
      >
        <span
          dir="ltr"
          className="font-display font-black tracking-tighter text-mega-outline"
          style={{ fontSize: "clamp(60px, 12vw, 180px)", letterSpacing: "-0.04em" }}
        >
          AUTHORIZED BRANDS · AUTHORIZED BRANDS · AUTHORIZED BRANDS ·
        </span>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 mb-6 rounded-full bg-carbon/80 backdrop-blur-md border border-toyota-red/40 shadow-red-glow">
            <ShieldCheck className="w-4 h-4 text-toyota-red" />
            <span className="font-display font-black text-xs tracking-[0.25em] text-white">
              5 AUTHORIZED BRANDS
            </span>
          </div>

          <h2
            className="font-tajawal font-black text-white leading-[1.05] mb-4"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            اكتشف <span className="text-toyota-red">منتجاتنا</span>
          </h2>

          <div className="flex items-center justify-center gap-3 my-5">
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-toyota-red" />
            <span className="w-1.5 h-1.5 rounded-full bg-toyota-red shadow-red-glow" />
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-toyota-red" />
          </div>

          <p className="font-tajawal font-medium text-soft text-base md:text-lg max-w-xl mx-auto">
            اختر العلامة التجارية وتصفح جميع المنتجات المتاحة
          </p>
        </motion.div>

        {/* Brands Grid - 3+2 layout */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {brands.slice(0, 3).map((brand, i) => (
              <BrandCard key={brand.id} brand={brand} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-full sm:max-w-[66%] mx-auto">
            {brands.slice(3).map((brand, i) => (
              <BrandCard key={brand.id} brand={brand} index={i + 3} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center mt-14"
        >
          <Link
            to="/products"
            className="group relative inline-flex items-center gap-3 px-9 py-4 rounded-full bg-toyota-red text-white font-tajawal font-black text-base overflow-hidden animate-lux-red-pulse transition-transform duration-300 hover:scale-[1.04]"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 -inset-x-4 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-lux-shimmer-sweep"
              style={{ width: "40%" }}
            />
            <span className="relative">تصفح جميع المنتجات</span>
            <ArrowLeft className="relative w-5 h-5 transition-transform group-hover:-translate-x-1.5" />
            <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-white/25 pointer-events-none" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

const BrandCard = ({ brand, index }: { brand: typeof brands[0]; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5, type: "spring", stiffness: 100 }}
    >
      <Link to={brand.href} className="group block" aria-label={`تصفح منتجات ${brand.nameAr}`}>
        <motion.div
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative"
        >
          {/* Outer glow ring on hover */}
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-toyota-red/30 via-transparent to-gold/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

          {/* Card */}
          <div className="relative rounded-2xl overflow-hidden bg-carbon/80 backdrop-blur-xl border border-white/10 group-hover:border-toyota-red/50 shadow-2xl shadow-black/50 transition-all duration-300">
            {/* Corner brackets inside card */}
            <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-t border-l border-gold/60 z-10" />
            <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-t border-r border-gold/60 z-10" />
            <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-gold/60 z-10" />
            <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-gold/60 z-10" />

            {/* Top red hairline */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent" />

            {/* Logo container - white background for logo visibility */}
            <div className="relative aspect-[4/3] flex items-center justify-center p-6 bg-white overflow-hidden">
              {/* Shimmer sweep on hover */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
              />
              <img
                src={brand.logo}
                alt={brand.nameAr}
                loading="lazy"
                className="relative max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110"
                style={{ transform: `scale(${brand.scale})` }}
              />

              {/* Floating code chip */}
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-carbon/90 border border-toyota-red/40">
                <span className="font-display font-black text-[10px] text-white tracking-wider">
                  <span className="text-toyota-red">#</span>{brand.code}
                </span>
              </div>
            </div>

            {/* Text block */}
            <div className="relative px-4 py-4 bg-carbon">
              <div className="text-center">
                <h3 className="font-tajawal font-black text-white text-sm md:text-base mb-1 group-hover:text-toyota-red transition-colors">
                  {brand.nameAr}
                </h3>
                <p className="font-display text-soft/70 text-[10px] md:text-xs font-bold tracking-[0.15em]">
                  {brand.nameEn}
                </p>
              </div>

              {/* CTA line */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-1.5 text-toyota-red opacity-80 group-hover:opacity-100 transition-opacity">
                <Sparkles className="w-3 h-3" />
                <span className="font-tajawal font-bold text-xs">تصفح المنتجات</span>
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default ProductsShowcase;
