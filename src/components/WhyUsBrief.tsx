import { motion } from "framer-motion";
import { ShieldCheck, Clock, Users, Truck, Cog, TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const highlights = [
  {
    icon: ShieldCheck,
    title: "اعتماد تويوتا الرسمي",
    desc: "موزّع معتمد رسمياً من تويوتا مصر لقطع الغيار والزيوت.",
  },
  {
    icon: Clock,
    title: "خبرة أكثر من 25 عامًا",
    desc: "خبرة تراكمية في سوق قطع الغيار منذ عام 1999.",
  },
  {
    icon: Users,
    title: "شبكة عملاء واسعة",
    desc: "أكثر من 1,000 عميل نشط عبر محافظات مصر.",
  },
  {
    icon: Truck,
    title: "تسليم خلال 48 ساعة",
    desc: "بنية لوجستية متكاملة تغطي الجمهورية بالكامل.",
  },
  {
    icon: Cog,
    title: "نظام ERP متكامل",
    desc: "إدارة مخزون رقمية لضمان دقة الطلبات والتوريد.",
  },
  {
    icon: TrendingUp,
    title: "انضباط سعري",
    desc: "أسعار موحدة وعادلة تحمي سوق التوزيع.",
  },
];

const WhyUsBrief = () => {
  return (
    <section id="why-us" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            لماذا تختارنا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            ما <span className="text-primary">يميزنا</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            معايير تشغيل احترافية تجعلنا الاختيار الأول للتجار والموزعين
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {highlights.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="bg-card rounded-xl border border-border p-6 h-full"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="font-bold text-foreground text-base mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <Button size="lg" className="gap-3 font-bold" asChild>
            <Link to="/what-sets-us-apart">
              اكتشف المزيد
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyUsBrief;
