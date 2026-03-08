import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Package, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-corporate.jpg";

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden">
      {/* Background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img
          src={heroBg}
          alt="مستودع توزيع المصرية جروب — قطع غيار تويوتا الأصلية"
          className="w-full h-full object-cover scale-105"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-secondary/80" />
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-secondary to-transparent" />
      </motion.div>

      {/* Content */}
      <motion.div className="container mx-auto px-4 relative z-10 pt-28 md:pt-36 pb-20" style={{ opacity: contentOpacity }}>
        <div className="max-w-3xl">
          {/* Authorized Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 border border-primary/25 rounded-full px-4 py-2 mb-10"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">موزع معتمد رسمي — تويوتا مصر</span>
          </motion.div>

          {/* H1 — SEO optimized, single H1 on page */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-secondary-foreground leading-[1.15] tracking-tight mb-8"
          >
            المصرية جروب – موزع معتمد لقطع غيار تويوتا الأصلية وزيوت تويوتا الأصلية في مصر
          </motion.h1>

          {/* Subheadline */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-lg sm:text-xl md:text-2xl font-bold text-secondary-foreground/75 leading-[1.7] max-w-2xl mb-6"
          >
            متخصصون في توزيع قطع غيار تويوتا الأصلية، واستيراد الماركات اليابانية عالية الجودة التي تضاهي المواصفات الأصلية، مع شحن لجميع المحافظات وخدمة تجار الجملة والشركات والقطاعي.
          </motion.h2>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-secondary-foreground/50 text-base md:text-lg leading-[1.9] max-w-xl mb-12"
          >
            أكثر من 25 عامًا من الخبرة في سوق قطع غيار تويوتا في مصر.
          </motion.p>

          {/* CTAs — 2 buttons only */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button
              size="lg"
              className="text-base px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
              asChild
            >
              <Link to="/products">
                <Package className="w-5 h-5" />
                تصفح المنتجات
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 gap-2.5 font-bold border border-secondary-foreground/15 text-secondary-foreground bg-secondary-foreground/[0.04] backdrop-blur-sm hover:bg-secondary-foreground/10 transition-all duration-300"
              asChild
            >
              <Link to="/what-sets-us-apart#network">
                <MapPin className="w-5 h-5" />
                فروعنا وانتشارنا
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
