import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import catEngine from "@/assets/cat-engine.jpg";
import catSuspension from "@/assets/cat-suspension.jpg";
import catFilters from "@/assets/cat-filters.jpg";
import catOils from "@/assets/cat-oils.jpg";
import catElectrical from "@/assets/cat-electrical.jpg";
import catCooling from "@/assets/cat-cooling.jpg";

const categories = [
  { name: "أجزاء المحرك", image: catEngine, count: "+800 صنف", slug: "engine" },
  { name: "أجزاء العفشة", image: catSuspension, count: "+600 صنف", slug: "suspension" },
  { name: "الفلاتر", image: catFilters, count: "+400 صنف", slug: "filters" },
  { name: "زيوت تويوتا", image: catOils, count: "+50 صنف", slug: "oils-gasoline" },
  { name: "الكهرباء", image: catElectrical, count: "+500 صنف", slug: "electrical" },
  { name: "التبريد", image: catCooling, count: "+300 صنف", slug: "cooling" },
];

const CategoriesCatalog = () => {
  return (
    <section id="products" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            كتالوج المنتجات
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            تصفّح حسب <span className="text-gradient-red">الفئة</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            أكثر من 960 صنف أصلي تغطي جميع احتياجات صيانة سيارات تويوتا
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <Link
                to={`/products?category=${cat.slug}`}
                className="group relative block rounded-xl overflow-hidden aspect-[4/3] bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
              >
                {/* Image */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/40 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-secondary-foreground mb-0.5">
                      {cat.name}
                    </h3>
                    <span className="text-xs text-primary font-semibold">{cat.count}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowLeft className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesCatalog;
