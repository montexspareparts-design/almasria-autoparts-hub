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

const categories = [
  { name: "قطع المحرك", image: catEngine, count: "+800 صنف" },
  { name: "العفشة والتعليق", image: catSuspension, count: "+600 صنف" },
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
        <div className="flex justify-center gap-4 mb-10 flex-wrap">
          {[
            { label: "تويوتا أصلي", sub: "قطع غيار", to: "/products/toyota-genuine" },
            { label: "تويوتا أصلي", sub: "زيوت", to: "/products/toyota-oils" },
            { label: "MTX", sub: "Aftermarket", to: "/products/mtx-aftermarket" },
          ].map((b) => (
            <Link
              key={b.to}
              to={b.to}
              className="bg-secondary border border-primary/30 rounded-lg px-6 py-3 text-center card-hover block"
            >
              <div className="font-bold text-secondary-foreground">{b.label}</div>
              <div className="text-xs text-primary">{b.sub}</div>
            </Link>
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
              className="group relative rounded-lg overflow-hidden card-hover cursor-pointer"
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
