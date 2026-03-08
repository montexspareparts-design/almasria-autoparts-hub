import { motion, useMotionValue, useTransform } from "framer-motion";
import { ShieldCheck, DollarSign, Monitor, Truck, Globe, Handshake } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "موزع معتمد لتويوتا", desc: "وكيل رسمي معتمد لقطع الغيار والزيوت الأصلية" },
  { icon: DollarSign, title: "حماية الانضباط السعري", desc: "نحافظ على قيمة العلامة التجارية وانضباط الأسعار" },
  { icon: Monitor, title: "عمليات معتمدة على ERP", desc: "نظام ERP متكامل لإدارة العمليات بكفاءة" },
  { icon: Truck, title: "شبكة توزيع شاملة", desc: "تغطية كاملة لجمهورية مصر العربية" },
  { icon: Globe, title: "مكتب إقليمي في دبي", desc: "توسع إقليمي لدعم أسواق الخليج العربي" },
  { icon: Handshake, title: "علاقات مع موردين يابانيين", desc: "شراكات طويلة الأمد مع أفضل الموردين" },
];

const FeatureCard = ({ f, i }: { f: typeof features[0]; i: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-50, 50], [5, -5]);
  const rotateY = useTransform(x, [-50, 50], [-5, 5]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: -10 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: i * 0.1, duration: 0.6, type: "spring", stiffness: 80 }}
      whileHover={{ y: -8 }}
      onMouseMove={(e) => {
        const rect = (e.target as HTMLElement).closest('.feature-card')?.getBoundingClientRect();
        if (rect) {
          x.set(e.clientX - rect.left - rect.width / 2);
          y.set(e.clientY - rect.top - rect.height / 2);
        }
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="feature-card bg-card border border-border rounded-xl p-6 transition-colors duration-300 hover:border-primary/40 group cursor-default relative overflow-hidden"
    >
      {/* Gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500" />
      
      <div className="relative z-10">
        <motion.div
          className="w-14 h-14 bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl flex items-center justify-center mb-4 border border-primary/10"
          whileHover={{ scale: 1.15, rotate: 5 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <f.icon className="w-7 h-7 text-primary" />
        </motion.div>
        <h3 className="text-lg font-bold text-card-foreground mb-2">{f.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
        <motion.div
          className="h-0.5 bg-gradient-to-l from-primary/40 to-transparent mt-4 rounded-full origin-right"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 + 0.4, duration: 0.6 }}
        />
      </div>
    </motion.div>
  );
};

const WhyUsSection = () => {
  return (
    <section id="why-us" className="relative py-20 md:py-28 bg-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      
      <div className="container mx-auto px-4 relative">
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
            <FeatureCard key={f.title} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
