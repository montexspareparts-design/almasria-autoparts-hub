import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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
    nameAr: "MTX أفترماركت",
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

const ProductsShowcase = () => {
  return (
    <section className="relative py-24 md:py-32 bg-secondary overflow-hidden">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Red accent line top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <p className="text-primary text-sm font-black tracking-[0.3em] uppercase mb-5">
            تصفح الماركات
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-secondary-foreground leading-tight mb-4">
            اكتشف <span className="text-primary">منتجاتنا</span>
          </h2>
          <p className="text-secondary-foreground/50 text-sm leading-relaxed max-w-md mx-auto mb-6">
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

      {/* Red accent line bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
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
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:shadow-primary/20 transition-shadow duration-300">
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
