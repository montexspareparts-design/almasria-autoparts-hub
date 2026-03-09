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
  {
    id: "toyota_genuine",
    nameAr: "قطع غيار تويوتا الأصلية",
    nameEn: "Toyota Genuine Parts",
    logo: brandGenuine,
    href: "/products/toyota-genuine",
    scale: 1,
  },
  {
    id: "toyota_oils",
    nameAr: "زيوت تويوتا الأصلية",
    nameEn: "Toyota Genuine Lubricants",
    logo: brandOil,
    href: "/products/toyota-oils",
    scale: 1.5,
  },
  {
    id: "mtx_aftermarket",
    nameAr: "MTX Aftermarket",
    nameEn: "MTX Aftermarket",
    logo: brandMtx,
    href: "/products/mtx-aftermarket",
    scale: 1.5,
  },
  {
    id: "denso",
    nameAr: "دينسو",
    nameEn: "DENSO",
    logo: brandDenso,
    href: "/products/denso",
    scale: 1,
  },
  {
    id: "aisin",
    nameAr: "أيسن",
    nameEn: "AISIN",
    logo: brandAisin,
    href: "/products/aisin",
    scale: 1,
  },
];

/* ── Floating Gears Background ── */
const floatingGears = [
  { icon: Cog, size: 40, x: "5%", y: "15%", duration: 25, delay: 0, rotate: 360, opacity: 0.06 },
  { icon: Cog, size: 60, x: "90%", y: "20%", duration: 30, delay: 2, rotate: -360, opacity: 0.05 },
  { icon: Wrench, size: 30, x: "80%", y: "70%", duration: 20, delay: 1, rotate: 15, opacity: 0.06 },
  { icon: Cog, size: 50, x: "12%", y: "75%", duration: 28, delay: 3, rotate: 360, opacity: 0.05 },
  { icon: Settings, size: 35, x: "50%", y: "10%", duration: 22, delay: 4, rotate: -360, opacity: 0.04 },
  { icon: Cog, size: 70, x: "70%", y: "85%", duration: 35, delay: 1.5, rotate: 360, opacity: 0.04 },
  { icon: Wrench, size: 25, x: "30%", y: "90%", duration: 18, delay: 2.5, rotate: -20, opacity: 0.06 },
  { icon: Cog, size: 45, x: "95%", y: "50%", duration: 26, delay: 0.5, rotate: -360, opacity: 0.05 },
  { icon: Droplets, size: 22, x: "20%", y: "45%", duration: 16, delay: 3.5, rotate: 0, opacity: 0.05 },
  { icon: Settings, size: 55, x: "40%", y: "60%", duration: 32, delay: 5, rotate: 360, opacity: 0.03 },
];

const FloatingGear = ({ gear }: { gear: typeof floatingGears[0] }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: gear.x, top: gear.y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, gear.opacity, gear.opacity * 0.6, gear.opacity, 0],
      scale: [0.5, 1, 0.85, 1, 0.5],
      y: [0, -15, 8, -10, 0],
      rotate: [0, gear.rotate],
    }}
    transition={{ duration: gear.duration, delay: gear.delay, repeat: Infinity, ease: "linear" }}
  >
    <gear.icon className="text-primary" style={{ width: gear.size, height: gear.size }} strokeWidth={0.8} />
  </motion.div>
);

const ProductsShowcase = () => {
  return (
    <section className="relative py-24 md:py-32 bg-transparent overflow-hidden">
      {/* Floating gears background */}
      <div className="absolute inset-0 z-0">
        {floatingGears.map((gear, i) => (
          <FloatingGear key={i} gear={gear} />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-4">
            اكتشف <span className="text-primary">منتجاتنا</span>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-6">
            اختر العلامة التجارية وتصفح جميع المنتجات المتاحة
          </p>
          {/* Animated underline */}
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
          {/* Top row - 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            {brands.slice(0, 3).map((brand, i) => (
              <BrandCard key={brand.id} brand={brand} index={i} />
            ))}
          </div>
          {/* Bottom row - 2 cards centered */}
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
      transition={{
        delay: 0.1 + index * 0.1,
        duration: 0.5,
        type: "spring",
        stiffness: 100,
      }}
    >
      <Link
        to={brand.href}
        className="group block"
        aria-label={`تصفح منتجات ${brand.nameAr}`}
      >
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative"
        >
          {/* Card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-black/10 group-hover:shadow-xl group-hover:shadow-primary/20 transition-shadow duration-300 border border-border">
            {/* Red accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
            
            {/* Logo container */}
            <div className="aspect-[4/3] flex items-center justify-center p-6 bg-white">
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
            <h3 className="font-black text-foreground text-base mb-1 group-hover:text-primary transition-colors">
              {brand.nameAr}
            </h3>
            <p className="text-muted-foreground text-xs font-medium">
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
