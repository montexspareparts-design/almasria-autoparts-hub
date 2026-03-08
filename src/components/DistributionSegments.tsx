import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import brandGenuineParts from "@/assets/brand-genuine-parts.png";
import brandToyotaOil from "@/assets/brand-toyota-oil.png";
import brandMtx from "@/assets/brand-mtx.jpg";

const segments = [
  {
    name: "قطع غيار أصلية",
    nameEn: "Toyota Genuine Parts",
    image: brandGenuineParts,
    description:
      "قطع غيار تويوتا الأصلية 100% بضمان المصنع، تغطي جميع موديلات تويوتا المتوفرة في السوق المصري.",
    to: "/products/toyota-genuine",
    badge: "+800 صنف",
  },
  {
    name: "زيوت ومنتجات أصلية",
    nameEn: "Toyota Genuine Lubricants",
    image: brandToyotaOil,
    description:
      "زيوت محركات وناقل حركة معتمدة من تويوتا، مصمّمة لضمان أعلى أداء وحماية للمحرك.",
    to: "/products/toyota-oils",
    badge: "+50 صنف",
  },
  {
    name: "ماركات يابانية مختارة — MTX",
    nameEn: "MTX Aftermarket",
    image: brandMtx,
    description:
      "علامات يابانية عالمية بمعايير جودة تضاهي الأصلية، بأسعار تنافسية تخدم شريحة أوسع من السوق.",
    to: "/mtx",
    badge: "+100 صنف",
  },
];

const DistributionSegments = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/40">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-block text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            خطوط التوزيع
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            قطاعات <span className="text-primary">التوزيع</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            ثلاثة خطوط رئيسية تغطي كافة احتياجات سوق قطع غيار تويوتا
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {segments.map((seg, i) => (
            <motion.div
              key={seg.to}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
            >
              <Link
                to={seg.to}
                className="group relative flex flex-col items-center rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 p-8 text-center h-full"
              >
                {/* Badge */}
                <span className="absolute top-4 left-4 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5">
                  {seg.badge}
                </span>

                {/* Image */}
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-xl bg-white border border-border flex items-center justify-center p-4 mb-6 transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={seg.image}
                    alt={seg.nameEn}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Text */}
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {seg.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {seg.description}
                </p>

                {/* CTA */}
                <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all">
                  تفاصيل القطاع
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

export default DistributionSegments;
