import { motion } from "framer-motion";
import { ShieldCheck, Package, Truck, Globe, Award, Handshake } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "موزع معتمد رسمي", desc: "موزع رسمي معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر" },
  { icon: Award, title: "منتجات أصلية مضمونة", desc: "جميع منتجاتنا أصلية 100% بضمان الجودة والمصدر" },
  { icon: Package, title: "مخزون ضخم وجاهزية فورية", desc: "أكثر من 5000 صنف متوفر بشكل دائم للتسليم الفوري" },
  { icon: Truck, title: "توزيع لجميع المحافظات", desc: "شبكة توزيع تغطي مصر بالكامل من القاهرة والجيزة والأقصر" },
  { icon: Globe, title: "توسع إقليمي – دبي", desc: "فرع في دبي كمركز إقليمي لدعم التوسع الخليجي" },
  { icon: Handshake, title: "MTX – علامتنا الخاصة", desc: "علامة تجارية مسجلة لقطع غيار Aftermarket مستوردة بأعلى جودة" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, rotateX: -10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { delay: i * 0.12, duration: 0.6, type: "spring", stiffness: 80, damping: 15 },
  }),
};

const WhyUsSection = () => {
  return (
    <section id="why-us" className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
          >
            مميزاتنا
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            لماذا <span className="text-gradient-red">المصرية جروب؟</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full"
          />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: "1000px" }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 20px 40px hsl(355 90% 48% / 0.1)" }}
              className="bg-card border border-border rounded-xl p-6 transition-colors duration-300 hover:border-primary/40 group cursor-default"
            >
              <motion.div
                className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4"
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <f.icon className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
              </motion.div>
              <h3 className="text-lg font-bold text-card-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              <motion.div
                className="h-0.5 bg-primary/20 mt-4 rounded-full origin-right"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 + 0.4, duration: 0.6 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
