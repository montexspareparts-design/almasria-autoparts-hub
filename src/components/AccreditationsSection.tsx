import { motion } from "framer-motion";
import { Award, Star } from "lucide-react";
import awardTrophy from "@/assets/award-trophy.webp";
import autotechExhibition from "@/assets/autotech-exhibition.webp";

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
    <section id="accreditations" className="py-20 md:py-28 bg-dark-section overflow-hidden relative">
      {/* Background glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[hsl(var(--gold-accent))]/5 blur-[150px]"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
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
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, type: "spring", stiffness: 80 }}
              whileHover={{ y: -8 }}
              className="group rounded-2xl overflow-hidden border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/40 transition-all duration-500 shadow-lg shadow-black/20 hover:shadow-primary/20 hover:shadow-2xl"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <motion.img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.7 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--section-dark))] via-[hsl(var(--section-dark))]/40 to-transparent" />
                
                {/* Icon badge */}
                <motion.div
                  className="absolute top-4 left-4 w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 + 0.4, type: "spring" }}
                >
                  <item.icon className="w-5 h-5 text-primary" />
                </motion.div>

                <div className="absolute bottom-0 right-0 left-0 p-6">
                  <div className="flex items-center gap-2 mb-2">
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
