import { motion } from "framer-motion";
import { ShieldCheck, Package, Truck, Globe, Award, Handshake } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "موزع معتمد", desc: "موزع رسمي معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر" },
  { icon: Award, title: "منتجات أصلية مضمونة", desc: "جميع منتجاتنا أصلية 100% بضمان الجودة والمصدر" },
  { icon: Package, title: "مخزون ضخم وجاهزية فورية", desc: "أكثر من 5000 صنف متوفر بشكل دائم للتسليم الفوري" },
  { icon: Truck, title: "شبكة توزيع فعالة", desc: "تغطية شاملة من القاهرة إلى جميع المحافظات" },
  { icon: Globe, title: "خبرة في الاستيراد المباشر", desc: "استيراد مباشر من اليابان بأفضل الأسعار والجودة" },
  { icon: Handshake, title: "علاقات استراتيجية", desc: "شراكات طويلة الأمد مع كبار الموردين اليابانيين" },
];

const WhyUsSection = () => {
  return (
    <section id="why-us" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            لماذا <span className="text-gradient-red">المصرية جروب؟</span>
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-lg p-6 card-hover"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
