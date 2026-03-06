import { motion } from "framer-motion";
import { Globe, CheckCircle2 } from "lucide-react";

const PartnershipsSection = () => {
  return (
    <section id="partnerships" className="py-20 md:py-28 bg-dark-section">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-dark-section-foreground mb-4">
            قوة <span className="text-gradient-red">الاستيراد</span> والتوزيع
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-8 h-8 text-primary" />
              <h3 className="text-2xl font-bold text-dark-section-foreground">
                شبكة استيراد وتوزيع قوية
              </h3>
            </div>
            <p className="text-dark-section-foreground/70 leading-relaxed">
              تتميز المصرية جروب بخبرة عميقة في عمليات الاستيراد المباشر وإدارة سلسلة الإمداد، مع قدرات لوجستية متقدمة تضمن توفير أفضل المنتجات بأعلى جودة وأسرع وقت. تدعم شبكتنا الدولية توفير قطع الغيار الأصلية والمستوردة لعملائنا في مصر والمنطقة.
            </p>

            <ul className="space-y-3">
              {[
                "إدارة متكاملة لعمليات الاستيراد المباشر",
                "خبرة طويلة في التعامل مع الموردين الدوليين",
                "التزام تام بمعايير الجودة العالمية",
                "شبكة توزيع تغطي جميع محافظات مصر",
                "توسع إقليمي مدروس عبر فرع دبي",
                "وكلاء حصريون لعلامات تجارية مختارة",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-dark-section-foreground/80">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-secondary-foreground/5 border border-primary/20 rounded-xl p-8"
          >
            <h4 className="text-xl font-bold text-dark-section-foreground mb-6 text-center">
              أرقام تتحدث عنا
            </h4>
            <div className="grid grid-cols-2 gap-6">
              {[
                { num: "+25", label: "عام من الخبرة" },
                { num: "+5000", label: "صنف في المخزون" },
                { num: "5", label: "فروع في مصر ودبي" },
                { num: "+1000", label: "عميل نشط" },
              ].map((s) => (
                <div key={s.label} className="text-center p-4 bg-secondary/30 rounded-lg">
                  <div className="text-3xl font-black text-primary">{s.num}</div>
                  <div className="text-sm text-dark-section-foreground/60 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PartnershipsSection;
