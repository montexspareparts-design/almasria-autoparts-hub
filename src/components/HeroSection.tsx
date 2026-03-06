import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="مستودع قطع غيار تويوتا" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-l from-secondary/95 via-secondary/80 to-secondary/60" />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 mb-6"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">موزع معتمد لقطع غيار وزيوت تويوتا الأصلية</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black text-secondary-foreground leading-tight mb-6"
          >
            شريكك الأول في
            <br />
            <span className="text-gradient-red">قطع غيار السيارات</span>
            <br />
            في مصر
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-secondary-foreground/70 mb-8 max-w-xl leading-relaxed"
          >
            مخزون ضخم • توزيع سريع • منتجات أصلية مضمونة
            <br />
            من القاهرة إلى جميع أنحاء الجمهورية
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" className="text-lg px-8 gap-2 red-glow" asChild>
              <a href="#contact">
                اطلب عرض سعر
                <ArrowLeft className="w-5 h-5" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
              <a href="#products">تصفح المنتجات</a>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex gap-8 mt-12 pt-8 border-t border-secondary-foreground/10"
          >
            {[
              { num: "+15", label: "سنة خبرة" },
              { num: "+5000", label: "صنف في المخزون" },
              { num: "+500", label: "عميل نشط" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-black text-primary">{stat.num}</div>
                <div className="text-sm text-secondary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
