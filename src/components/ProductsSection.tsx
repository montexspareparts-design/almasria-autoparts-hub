import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import catEngine from "@/assets/cat-engine.jpg";
import catSuspension from "@/assets/cat-suspension.jpg";
import catFilters from "@/assets/cat-filters.jpg";
import catOils from "@/assets/cat-oils.jpg";
import catElectrical from "@/assets/cat-electrical.jpg";
import catCooling from "@/assets/cat-cooling.jpg";
import brandGenuineParts from "@/assets/brand-genuine-parts.png";
import brandToyotaOil from "@/assets/brand-toyota-oil.png";
import brandMtx from "@/assets/brand-mtx.jpg";

const categories = [
  { name: "أجزاء المحرك", image: catEngine, count: "+800 صنف" },
  { name: "أجزاء العفشة", image: catSuspension, count: "+600 صنف" },
  { name: "الفلاتر", image: catFilters, count: "+400 صنف" },
  { name: "زيوت تويوتا الأصلية", image: catOils, count: "+50 صنف" },
  { name: "الكهرباء", image: catElectrical, count: "+500 صنف" },
  { name: "التبريد", image: catCooling, count: "+300 صنف" },
];

const ProductsSection = () => {
  const { isDealer, user } = useAuth();
  const navigate = useNavigate();

  return (
    <section id="products" className="py-20 md:py-28 bg-dark-section">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-dark-section-foreground mb-4">
            <span className="text-gradient-red">منتجاتنا</span>
          </h2>
          <p className="text-dark-section-foreground/60 text-lg max-w-2xl mx-auto">
            قطع غيار وزيوت تويوتا أصلي وبديل الأصلي MTX Aftermarket
          </p>
          <div className="w-20 h-1 bg-primary mx-auto mt-4" />
        </motion.div>

        {/* Brand Labels */}
        <div className="grid grid-cols-3 gap-5 md:gap-8 mb-12 max-w-3xl mx-auto">
          {[
            { label: "قطع غيار تويوتا الأصلية", image: brandGenuineParts, to: "/products/toyota-genuine", imgScale: "scale-100" },
            { label: "زيوت تويوتا الأصلية", image: brandToyotaOil, to: "/products/toyota-oils", imgScale: "scale-150" },
            { label: "MTX Aftermarket", image: brandMtx, to: "/products/mtx-aftermarket", imgScale: "scale-150" },
          ].map((b, i) => (
            <motion.div
              key={b.to}
              initial={{ opacity: 0, y: 40, rotateY: -15 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.6, type: "spring", stiffness: 100, damping: 12 }}
              whileHover={{ scale: 1.07, y: -10 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-3"
            >
              <Link
                to={b.to}
                className="relative bg-white rounded-2xl aspect-square w-full flex items-center justify-center group border-2 border-primary/20 hover:border-primary/60 transition-all duration-500 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(235,10,30,0.05)] group-hover:shadow-[inset_0_0_40px_rgba(235,10,30,0.12)] transition-shadow duration-500 rounded-2xl" />
                <img
                  src={b.image}
                  alt={b.label}
                  className={`relative z-10 w-[95%] h-[95%] object-contain transition-transform duration-500 group-hover:scale-105 ${b.imgScale}`}
                />
              </Link>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 + 0.3 }}
                className="text-xs md:text-sm font-bold text-secondary-foreground text-center"
              >
                {b.label}
              </motion.p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to="/products/toyota-genuine"
                className="group relative rounded-lg overflow-hidden card-hover cursor-pointer block"
              >
                <div className="aspect-[4/3] relative">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 p-6">
                    <h3 className="text-xl font-bold text-secondary-foreground mb-1">{cat.name}</h3>
                    <p className="text-sm text-primary font-semibold">{cat.count}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button size="lg" className="gap-2 red-glow text-lg px-8" asChild>
            <Link to="/products/toyota-genuine">
              استعراض المنتجات
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductsSection;
