import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import brandGenuineParts from "@/assets/brand-genuine-parts.png";
import brandToyotaOil from "@/assets/brand-toyota-oil.png";
import brandMtx from "@/assets/brand-mtx.jpg";

const segments = [
  {
    name: "قطع غيار تويوتا الأصلية",
    nameEn: "Toyota Genuine Parts",
    image: brandGenuineParts,
    description:
      "قطع غيار تويوتا الأصلية 100% بضمان المصنع، تغطي جميع موديلات تويوتا المتوفرة في السوق المصري.",
    to: "/products/toyota-genuine",
    badge: "+800 صنف",
  },
  {
    name: "زيوت تويوتا الأصلية",
    nameEn: "Toyota Genuine Lubricants",
    image: brandToyotaOil,
    description:
      "زيوت محركات وناقل حركة معتمدة من تويوتا، مصمّمة لضمان أعلى أداء وحماية للمحرك.",
    to: "/products/toyota-oils",
    badge: "+50 صنف",
  },
  {
    name: "MTX — جودة تضاهي الأصلي",
    nameEn: "MTX Aftermarket",
    image: brandMtx,
    description:
      "قطع غيار بديلة مختارة بعناية تضاهي المواصفات الأصلية، لتلبية احتياجات خدمة ما بعد البيع.",
    to: "/mtx",
    badge: "+100 صنف",
  },
];

const DistributionSegments = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/40 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4"
          >
            خطوط التوزيع
          </motion.span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 leading-tight">
            خطوط <span className="text-primary">المنتجات</span>
          </h2>
          <motion.div
            className="w-16 h-1 bg-primary mx-auto rounded-full mb-5"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto leading-[1.9] font-medium">
            ثلاثة خطوط رئيسية تغطي كافة احتياجات سوق قطع غيار تويوتا في مصر
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {segments.map((seg, i) => (
            <motion.div
              key={seg.to}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: 0.15 + i * 0.15,
                duration: 0.55,
                type: "spring",
                stiffness: 90,
              }}
              whileHover={{
                y: -8,
                scale: 1.02,
                transition: { duration: 0.25 },
              }}
            >
              <Link
                to={seg.to}
                className="group relative flex flex-col items-center rounded-2xl overflow-hidden bg-card border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/15 p-8 text-center h-full"
              >
                {/* Enhanced gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Badge */}
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="absolute top-5 left-5 text-xs font-black text-primary bg-primary/15 border-2 border-primary/30 rounded-full px-3.5 py-1 z-10 shadow-sm"
                >
                  {seg.badge}
                </motion.span>

                {/* Image */}
                <motion.div
                  className="w-36 h-36 md:w-40 md:h-40 rounded-2xl bg-white border-2 border-border flex items-center justify-center p-5 mb-7 relative z-10 shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 3, y: -8 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 150 }}
                >
                  <img
                    src={seg.image}
                    alt={seg.nameEn}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </motion.div>

                {/* Text */}
                <div className="relative z-10">
                  <h3 className="text-xl font-black text-foreground mb-3">
                    {seg.name}
                  </h3>
                  <p className="text-sm text-foreground/70 leading-[1.9] mb-7 font-medium">
                    {seg.description}
                  </p>

                  {/* CTA */}
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all">
                    تفاصيل القطاع
                    <motion.span
                      animate={{ x: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </motion.span>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DistributionSegments;
