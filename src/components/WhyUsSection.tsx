import { motion } from "framer-motion";
import { ShieldCheck, DollarSign, Monitor, Truck, Globe, Handshake } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "موزع معتمد لتويوتا", desc: "وكيل رسمي معتمد لقطع الغيار والزيوت الأصلية" },
  { icon: DollarSign, title: "حماية الانضباط السعري", desc: "نحافظ على قيمة العلامة التجارية وانضباط الأسعار" },
  { icon: Monitor, title: "عمليات معتمدة على ERP", desc: "نظام ERP متكامل لإدارة العمليات بكفاءة" },
  { icon: Truck, title: "شبكة توزيع شاملة", desc: "تغطية كاملة لجمهورية مصر العربية" },
  { icon: Globe, title: "مكتب إقليمي في دبي", desc: "توسع إقليمي لدعم أسواق الخليج العربي" },
  { icon: Handshake, title: "علاقات مع موردين يابانيين", desc: "شراكات طويلة الأمد مع أفضل الموردين" },
];

const WhyUsSection = () => {
  return (
    <section id="why-us" className="relative py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
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
              initial={{ opacity: 0, y: 40, rotateX: -10 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.1, duration: 0.6, type: "spring", stiffness: 80 }}
              whileHover={{ y: -8, boxShadow: "0 20px 40px hsl(355 90% 48% / 0.1)" }}
              className="bg-card border border-border rounded-xl p-6 transition-colors duration-300 hover:border-primary/40 group cursor-default"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                <f.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              <motion.div
                className="h-0.5 bg-primary/20 mt-4 rounded-full origin-right"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.4, duration: 0.6 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
