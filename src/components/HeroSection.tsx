import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section id="hero" className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="مستودع قطع غيار تويوتا" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-l from-secondary/95 via-secondary/85 to-secondary/50" />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20 pb-8">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 mb-6"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-secondary-foreground leading-tight mb-4 md:mb-6"
          >
            25 عامًا من الثقة
            <br />
            <span className="text-gradient-red">في عالم قطع غيار تويوتا</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 md:mb-10"
          >
            <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-secondary-foreground/90 text-sm md:text-base px-5 py-2 rounded-full">قطع غيار تويوتا أصلي</span>
            <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-secondary-foreground/90 text-sm md:text-base px-5 py-2 rounded-full">زيوت تويوتا أصلي</span>
            <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-secondary-foreground/90 text-sm md:text-base px-5 py-2 rounded-full">MTX Aftermarket</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              className="text-lg px-8 gap-2 border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10 bg-transparent border"
              asChild
            >
              <a href="#products">
                <Package className="w-5 h-5" />
                استعرض المنتجات
                <ArrowLeft className="w-5 h-5" />
              </a>
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
              { num: "+25", label: "سنة خبرة" },
              { num: "+5000", label: "صنف في المخزون" },
              { num: "+1000", label: "عميل نشط" },
              { num: "5", label: "فروع" },
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
