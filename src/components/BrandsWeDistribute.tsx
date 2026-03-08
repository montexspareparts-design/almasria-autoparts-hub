import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import brandGenuineParts from "@/assets/brand-genuine-parts.png";
import brandToyotaOil from "@/assets/brand-toyota-oil.png";
import brandMtx from "@/assets/brand-mtx.jpg";
import brandDenso from "@/assets/brand-denso.png";
import brandAisin from "@/assets/brand-aisin.png";

const brands = [
  { label: "Toyota Genuine Parts", labelAr: "قطع غيار تويوتا الأصلية", image: brandGenuineParts, to: "/products/toyota-genuine", scale: "scale-100" },
  { label: "Toyota Genuine Lubricants", labelAr: "زيوت تويوتا الأصلية", image: brandToyotaOil, to: "/products/toyota-oils", scale: "scale-150" },
  { label: "MTX Aftermarket", labelAr: "MTX أفترماركت", image: brandMtx, to: "/products/mtx-aftermarket", scale: "scale-150" },
  { label: "DENSO", labelAr: "DENSO", image: brandDenso, to: "/products/denso", scale: "scale-100" },
  { label: "AISIN", labelAr: "AISIN", image: brandAisin, to: "/products/aisin", scale: "scale-100" },
];

const BrandsWeDistribute = () => {
  return (
    <section id="brands" className="py-20 md:py-28 bg-dark-section overflow-hidden relative">
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-10 left-[10%] w-72 h-72 rounded-full bg-primary/5 blur-[120px]"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-10 right-[10%] w-56 h-56 rounded-full bg-[hsl(var(--gold-accent))]/5 blur-[100px]"
        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-bold mb-4"
          >
            علاماتنا التجارية
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-[hsl(var(--section-dark-foreground))] mb-4">
            العلامات التي <span className="shimmer-text">نوزعها</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full"
          />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {brands.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, y: 40, rotateY: -15 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 80 }}
              className="flex flex-col items-center gap-4"
            >
              <Link
                to={b.to}
                className="relative bg-white rounded-2xl aspect-[4/3] w-full flex items-center justify-center group border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/50 transition-all duration-500 overflow-hidden shadow-lg shadow-black/20 hover:shadow-primary/30 hover:shadow-2xl"
              >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                />
                <motion.img
                  src={b.image}
                  alt={b.label}
                  loading="lazy"
                  className={`relative z-10 w-[85%] h-[85%] object-contain ${b.scale}`}
                  whileHover={{ scale: 1.1, rotate: [0, -2, 2, 0] }}
                  transition={{ duration: 0.4 }}
                />
              </Link>
              <motion.div
                whileHover={{ scale: 1.05 }}
              >
                <Link
                  to={b.to}
                  className="inline-flex items-center gap-1.5 bg-[hsl(var(--section-dark))]/80 backdrop-blur-sm border border-[hsl(var(--section-dark-foreground))]/15 text-[hsl(var(--section-dark-foreground))]/80 text-sm px-5 py-2 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--red-glow)/0.4)] group"
                >
                  {b.labelAr}
                  <ChevronLeft className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsWeDistribute;
