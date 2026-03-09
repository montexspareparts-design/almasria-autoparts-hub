import { motion } from "framer-motion";
import { ArrowLeft, Cog, Wrench, Settings, Droplets } from "lucide-react";
import { Link } from "react-router-dom";

// Brand logos
import brandGenuine from "@/assets/brand-genuine-parts.png";
import brandOil from "@/assets/brand-toyota-oil.png";
import brandMtx from "@/assets/brand-mtx.jpg";
import brandDenso from "@/assets/brand-denso.png";
import brandAisin from "@/assets/brand-aisin.png";

const brands = [
  { id: "toyota_genuine", nameAr: "قطع غيار تويوتا الأصلية", nameEn: "Toyota Genuine Parts", logo: brandGenuine, href: "/products/toyota-genuine", scale: 1 },
  { id: "toyota_oils", nameAr: "زيوت تويوتا الأصلية", nameEn: "Toyota Genuine Lubricants", logo: brandOil, href: "/products/toyota-oils", scale: 1.5 },
  { id: "mtx_aftermarket", nameAr: "MTX Aftermarket", nameEn: "MTX Aftermarket", logo: brandMtx, href: "/products/mtx-aftermarket", scale: 1.5 },
  { id: "denso", nameAr: "دينسو", nameEn: "DENSO", logo: brandDenso, href: "/products/denso", scale: 1 },
  { id: "aisin", nameAr: "أيسن", nameEn: "AISIN", logo: brandAisin, href: "/products/aisin", scale: 1 },
];

/* ── Floating Gears ── */
const floatingGears = [
  { icon: Cog, size: 50, x: "5%", y: "12%", duration: 25, delay: 0, rotate: 360 },
  { icon: Cog, size: 80, x: "88%", y: "18%", duration: 32, delay: 2, rotate: -360 },
  { icon: Wrench, size: 35, x: "78%", y: "72%", duration: 20, delay: 1, rotate: 15 },
  { icon: Cog, size: 65, x: "10%", y: "78%", duration: 28, delay: 3, rotate: 360 },
  { icon: Settings, size: 45, x: "48%", y: "8%", duration: 22, delay: 4, rotate: -360 },
  { icon: Cog, size: 90, x: "68%", y: "88%", duration: 35, delay: 1.5, rotate: 360 },
  { icon: Wrench, size: 30, x: "28%", y: "92%", duration: 18, delay: 2.5, rotate: -20 },
  { icon: Cog, size: 55, x: "93%", y: "52%", duration: 26, delay: 0.5, rotate: -360 },
  { icon: Droplets, size: 28, x: "18%", y: "48%", duration: 16, delay: 3.5, rotate: 0 },
  { icon: Settings, size: 70, x: "38%", y: "62%", duration: 32, delay: 5, rotate: 360 },
];

/* ── Floating Toyota Words ── */
const floatingWords = [
  { text: "TOYOTA", x: "15%", y: "25%", size: "text-4xl", duration: 30, delay: 0, opacity: 0.07 },
  { text: "GENUINE", x: "70%", y: "15%", size: "text-3xl", duration: 25, delay: 1.5, opacity: 0.06 },
  { text: "قطع غيار", x: "55%", y: "75%", size: "text-2xl", duration: 28, delay: 3, opacity: 0.07 },
  { text: "PARTS", x: "25%", y: "65%", size: "text-5xl", duration: 35, delay: 2, opacity: 0.06 },
  { text: "أصلية", x: "82%", y: "45%", size: "text-3xl", duration: 22, delay: 4, opacity: 0.07 },
  { text: "OIL", x: "8%", y: "55%", size: "text-4xl", duration: 20, delay: 1, opacity: 0.06 },
  { text: "MTX", x: "60%", y: "35%", size: "text-6xl", duration: 40, delay: 5, opacity: 0.06 },
  { text: "DENSO", x: "35%", y: "85%", size: "text-2xl", duration: 24, delay: 2.5, opacity: 0.07 },
  { text: "تويوتا", x: "45%", y: "20%", size: "text-3xl", duration: 27, delay: 3.5, opacity: 0.06 },
  { text: "AISIN", x: "90%", y: "70%", size: "text-2xl", duration: 19, delay: 0.5, opacity: 0.07 },
];

const ProductsShowcase = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-secondary">
      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary via-secondary/95 to-secondary" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Floating gears */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {floatingGears.map((gear, i) => (
          <motion.div
            key={`gear-${i}`}
            className="absolute"
            style={{ left: gear.x, top: gear.y }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.15, 0.08, 0.15, 0],
              scale: [0.5, 1, 0.85, 1, 0.5],
              y: [0, -20, 10, -15, 0],
              rotate: [0, gear.rotate],
            }}
            transition={{ duration: gear.duration, delay: gear.delay, repeat: Infinity, ease: "linear" }}
          >
            <gear.icon className="text-white" style={{ width: gear.size, height: gear.size, opacity: 0.1 }} strokeWidth={0.8} />
          </motion.div>
        ))}
      </div>

      {/* Floating words */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {floatingWords.map((word, i) => (
          <motion.div
            key={`word-${i}`}
            className="absolute select-none"
            style={{ left: word.x, top: word.y }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, word.opacity, word.opacity * 0.5, word.opacity, 0],
              x: [0, 30, -20, 15, 0],
              y: [0, -10, 5, -8, 0],
            }}
            transition={{ duration: word.duration, delay: word.delay, repeat: Infinity, ease: "linear" }}
          >
            <span className={`${word.size} font-black text-white/10 tracking-widest whitespace-nowrap`}>
              {word.text}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Radial glow accents */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-secondary-foreground leading-tight mb-4">
            اكتشف <span className="text-primary">منتجاتنا</span>
          </h2>
          <p className="text-secondary-foreground/50 text-sm leading-relaxed max-w-md mx-auto mb-6">
            اختر العلامة التجارية وتصفح جميع المنتجات المتاحة
          </p>
          <motion.div
            className="w-16 h-1 bg-primary/60 rounded-full mx-auto"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>

        {/* Brands Grid - 3+2 layout */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            {brands.slice(0, 3).map((brand, i) => (
              <BrandCard key={brand.id} brand={brand} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[66%] mx-auto">
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
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-12"
        >
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold transition-colors group"
          >
            <span>تصفح جميع المنتجات</span>
            <motion.span
              animate={{ x: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.span>
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
      transition={{ delay: 0.1 + index * 0.1, duration: 0.5, type: "spring", stiffness: 100 }}
    >
      <Link to={brand.href} className="group block" aria-label={`تصفح منتجات ${brand.nameAr}`}>
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative"
        >
          {/* Glass card */}
          <div className="bg-white/[0.06] backdrop-blur-md rounded-2xl overflow-hidden shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-300 border border-secondary-foreground/10 group-hover:border-primary/30 group-hover:bg-white/[0.1]">
            {/* Red accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
            
            {/* Logo container */}
            <div className="aspect-[4/3] flex items-center justify-center p-6 bg-white/95 backdrop-blur-sm">
              <img
                src={brand.logo}
                alt={brand.nameAr}
                className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                style={{ transform: `scale(${brand.scale})` }}
              />
            </div>
          </div>

          {/* Text below card */}
          <div className="text-center mt-4">
            <h3 className="font-black text-secondary-foreground text-base mb-1 group-hover:text-primary transition-colors">
              {brand.nameAr}
            </h3>
            <p className="text-secondary-foreground/40 text-xs font-medium">
              {brand.nameEn}
            </p>
          </div>

          {/* Hover glow effect */}
          <div className="absolute -inset-1 bg-primary/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default ProductsShowcase;
