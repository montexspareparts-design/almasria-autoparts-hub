import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import brandGenuineParts from "@/assets/brand-genuine-parts.png";
import brandToyotaOil from "@/assets/brand-toyota-oil.png";
import brandMtx from "@/assets/brand-mtx.jpg";

const categories = [
  {
    name: "قطع غيار تويوتا أصلي",
    nameEn: "Toyota Genuine Parts",
    image: brandGenuineParts,
    description: "قطع غيار أصلية 100% بضمان تويوتا لجميع الموديلات",
    slug: "toyota-genuine",
    count: "+800 صنف",
  },
  {
    name: "زيوت تويوتا أصلي",
    nameEn: "Toyota Genuine Lubricants",
    image: brandToyotaOil,
    description: "زيوت محركات وفتيس أصلية معتمدة من تويوتا",
    slug: "toyota-oils",
    count: "+50 صنف",
  },
  {
    name: "MTX Aftermarket",
    nameEn: "MTX Aftermarket Parts",
    image: brandMtx,
    description: "منتجات أفترماركت عالية الجودة بأسعار تنافسية",
    slug: "mtx-aftermarket",
    count: "+100 صنف",
  },
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
            تصفّح <span className="text-gradient-red">منتجاتنا</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            أكثر من 960 صنف أصلي تغطي جميع احتياجات صيانة سيارات تويوتا
          </p>
        </motion.div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <Link
                to={`/products?brand=${cat.slug}`}
                className="group relative flex flex-col items-center rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 p-8 text-center h-full"
              >
                {/* Image */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl bg-white border border-border flex items-center justify-center p-4 mb-6 transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Text */}
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {cat.name}
                </h3>
                <p className="text-xs font-semibold text-primary mb-3">{cat.count}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {cat.description}
                </p>

                {/* CTA */}
                <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all">
                  تصفّح المنتجات
                  <ArrowLeft className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesCatalog;
