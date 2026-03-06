import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
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
            قطع غيار تويوتا الأصلية • زيوت تويوتا الأصلية • MTX Aftermarket
          </p>
          <div className="w-20 h-1 bg-primary mx-auto mt-4" />
        </motion.div>

        {/* Price Notice */}
        {!isDealer && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-secondary/60 border border-primary/30 rounded-lg p-4 mb-8 flex items-center justify-between flex-wrap gap-4"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary shrink-0" />
              <p className="text-secondary-foreground text-sm">
                <strong>الأسعار متاحة للتجار المعتمدين فقط.</strong>{" "}
                سجل كتاجر معتمد للاطلاع على الأسعار وطلب المنتجات.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => navigate(user ? "/dealer" : "/dealer-apply")}
            >
              {user ? "لوحة التحكم" : "طلب فتح حساب تاجر"}
            </Button>
          </motion.div>
        )}

        {/* Brand Labels */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
          {[
            { label: "قطع غيار تويوتا الأصلية", image: brandGenuineParts, to: "/products/toyota-genuine" },
            { label: "زيوت تويوتا الأصلية", image: brandToyotaOil, to: "/products/toyota-oils" },
            { label: "MTX Aftermarket", image: brandMtx, to: "/products/mtx-aftermarket" },
          ].map((b, i) => (
            <motion.div
              key={b.to}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5, type: "spring", stiffness: 120 }}
              whileHover={{ scale: 1.05, y: -8 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                to={b.to}
                className="bg-white rounded-xl p-3 text-center block aspect-square flex flex-col items-center justify-center gap-2 group shadow-lg hover:shadow-2xl transition-shadow duration-300 border border-gray-100"
              >
                <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={b.image}
                    alt={b.label}
                    className="max-h-full max-w-full object-contain scale-110 transition-transform duration-500 group-hover:scale-125"
                  />
                </div>
                <p className="text-xs md:text-sm font-bold text-gray-800 group-hover:text-primary transition-colors duration-300">{b.label}</p>
              </Link>
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
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button size="lg" className="gap-2 red-glow text-lg px-8" asChild>
            <a href="#contact">
              اطلب عرض سعر
              <ArrowLeft className="w-5 h-5" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductsSection;
