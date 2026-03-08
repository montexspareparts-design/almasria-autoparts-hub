import { motion } from "framer-motion";
import { Award, Star } from "lucide-react";
import awardTrophy from "@/assets/award-trophy.jpg";
import autotechExhibition from "@/assets/autotech-exhibition.jpg";

const accreditations = [
  {
    image: awardTrophy,
    title: "تكريم من تويوتا مصر",
    desc: "تحقيق المركز الأول في توزيع قطع الغيار الأصلية على مستوى الجمهورية",
    icon: Award,
  },
  {
    image: autotechExhibition,
    title: "معرض AUTOTECH",
    desc: "مشاركة رسمية في معرض AUTOTECH لقطع غيار السيارات",
    icon: Star,
  },
];

const AccreditationsSection = () => {
  return (
    <section id="accreditations" className="py-20 md:py-28 bg-dark-section overflow-hidden">
      <div className="container mx-auto px-4">
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
            <Award className="w-4 h-4 inline ml-1" />
            الاعتمادات والتكريمات
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-[hsl(var(--section-dark-foreground))] mb-4">
            إنجازات <span className="shimmer-text">تتحدث</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full"
          />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {accreditations.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="group rounded-2xl overflow-hidden border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/40 transition-all duration-500 shadow-lg shadow-black/20 hover:shadow-primary/15"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--section-dark))] via-[hsl(var(--section-dark))]/40 to-transparent" />
                <div className="absolute bottom-0 right-0 left-0 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-[hsl(var(--section-dark-foreground))]">{item.title}</h3>
                  </div>
                  <p className="text-sm text-[hsl(var(--section-dark-foreground))]/70">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AccreditationsSection;
