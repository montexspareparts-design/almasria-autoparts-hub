import { motion } from "framer-motion";
import { Award, Clock, Users, Truck, ArrowLeft, ShieldCheck, Cog, TrendingUp } from "lucide-react";
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
    desc: "أكثر من 2000 عميل نشط عبر محافظات مصر.",
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
    <section id="why-us" className="py-20 md:py-28 bg-background overflow-hidden relative">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-primary text-sm font-bold mb-5">
            <Award className="w-4 h-4" />
            لماذا تختارنا
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
            ما <span className="text-gradient-red">يميزنا</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            معايير تشغيل احترافية تجعلنا الاختيار الأول للتجار والموزعين
          </p>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full mt-5"
          />
        </motion.div>

        {/* 6 cards in 2×3 or 3×2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {highlights.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group"
            >
              <div className="bg-card rounded-xl border border-border hover:border-primary/25 transition-all duration-300 p-6 h-full hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="font-bold text-foreground text-base mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button
            size="lg"
            className="gap-3 font-bold text-base px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 group"
            asChild
          >
            <Link to="/what-sets-us-apart">
              اكتشف المزيد عن مميزاتنا
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyUsBrief;
