import { motion } from "framer-motion";
import { Globe, CheckCircle2 } from "lucide-react";

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.4, type: "spring" as const, stiffness: 100 },
  }),
};

const PartnershipsSection = () => {
  const items = [
    "إدارة متكاملة لعمليات الاستيراد المباشر",
    "خبرة طويلة في التعامل مع الموردين الدوليين",
    "التزام تام بمعايير الجودة العالمية",
    "شبكة توزيع تغطي جميع محافظات مصر",
    "توسع إقليمي مدروس عبر فرع دبي",
    "وكلاء حصريون لعلامات تجارية مختارة",
  ];

  const stats = [
    { num: "+25", label: "عام من الخبرة" },
    { num: "+5000", label: "صنف في المخزون" },
    { num: "5", label: "فروع في مصر ودبي" },
    { num: "+1000", label: "عميل نشط" },
  ];

  return (
    <section id="partnerships" className="py-20 md:py-28 bg-dark-section overflow-hidden">
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
            className="inline-block px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-bold mb-4"
          >
            شراكاتنا
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-dark-section-foreground mb-4">
            قوة <span className="text-gradient-red">الاستيراد</span> والتوزيع
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full"
          />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: "spring", stiffness: 60 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                <Globe className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="text-2xl font-bold text-dark-section-foreground">
                شبكة استيراد وتوزيع قوية
              </h3>
            </div>
            <p className="text-dark-section-foreground/70 leading-relaxed">
              تتميز المصرية جروب بخبرة عميقة في عمليات الاستيراد المباشر وإدارة سلسلة الإمداد، مع قدرات لوجستية متقدمة تضمن توفير أفضل المنتجات بأعلى جودة وأسرع وقت. تدعم شبكتنا الدولية توفير قطع الغيار الأصلية والمستوردة لعملائنا في مصر والمنطقة.
            </p>

            <ul className="space-y-3">
              {items.map((item, i) => (
                <motion.li
                  key={item}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={listItemVariants}
                  className="flex items-start gap-3 text-dark-section-foreground/80 group"
                >
                  <motion.div whileHover={{ scale: 1.3, rotate: 360 }} transition={{ duration: 0.3 }}>
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  </motion.div>
                  <span className="transition-colors group-hover:text-dark-section-foreground">{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -10 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: "spring", stiffness: 60 }}
            className="glass-panel-ios rounded-2xl p-8"
            style={{ perspective: "1000px" }}
          >
            <h4 className="text-xl font-bold text-dark-section-foreground mb-6 text-center">
              أرقام تتحدث عنا
            </h4>
            <div className="grid grid-cols-2 gap-6">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, type: "spring", stiffness: 150 }}
                  whileHover={{ scale: 1.08, boxShadow: "0 10px 30px hsl(355 90% 48% / 0.15)" }}
                  className="text-center p-4 glass-panel-ios rounded-xl cursor-default"
                >
                  <motion.div
                    className="text-3xl font-black text-primary"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + 0.2 }}
                  >
                    {s.num}
                  </motion.div>
                  <div className="text-sm text-dark-section-foreground/60 mt-1">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PartnershipsSection;
