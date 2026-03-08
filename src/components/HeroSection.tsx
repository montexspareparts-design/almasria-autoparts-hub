import { motion, useScroll, useTransform, useInView, animate } from "framer-motion";
import { ArrowLeft, ShieldCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";

const floatingVariants = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const HeroSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.85, 0.95]);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img src={heroBg} alt="مستودع قطع غيار تويوتا" className="w-full h-full object-cover scale-110" loading="eager" />
        <motion.div className="absolute inset-0 bg-gradient-to-l from-secondary/95 via-secondary/85 to-secondary/50" style={{ opacity: overlayOpacity }} />
      </motion.div>

      {/* Animated decorative elements */}
      <motion.div
        className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/5 blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-primary/5 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      <div className="container mx-auto px-4 relative z-10 pt-16 md:pt-24 pb-6 md:pb-8">
        <motion.div
          className="max-w-3xl"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={fadeSlideUp}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 mb-6"
          >
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold text-primary">موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية</span>
          </motion.div>

          <motion.h1
            variants={fadeSlideUp}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-secondary-foreground leading-tight mb-4 md:mb-6"
          >
            25 عامًا من الثقة
            <br />
            <motion.span
              className="text-gradient-red inline-block"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: "200% 200%" }}
            >
              في عالم قطع غيار تويوتا
            </motion.span>
          </motion.h1>

          <motion.div variants={fadeSlideUp} className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 md:mb-10">
            {["قطع غيار تويوتا أصلي", "زيوت تويوتا أصلي", "MTX Aftermarket"].map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.12, type: "spring", stiffness: 120 }}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-secondary-foreground/90 text-sm md:text-base px-5 py-2 rounded-full cursor-default transition-colors"
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>

          <motion.div variants={fadeSlideUp} className="flex flex-col sm:flex-row gap-4">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="text-lg px-8 gap-2 border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10 bg-transparent border group"
                asChild
              >
                <a href="#products">
                  <Package className="w-5 h-5 transition-transform group-hover:scale-110" />
                  استعرض المنتجات
                  <motion.div animate={{ x: [0, -5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ArrowLeft className="w-5 h-5" />
                  </motion.div>
                </a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeSlideUp}
            className="grid grid-cols-4 gap-3 sm:gap-8 mt-8 md:mt-12 pt-6 md:pt-8 border-t border-secondary-foreground/10"
          >
            {[
              { num: "+25", label: "سنة خبرة" },
              { num: "+5000", label: "صنف في المخزون" },
              { num: "+1000", label: "عميل نشط" },
              { num: "5", label: "فروع" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center sm:text-right"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.1, type: "spring" }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="text-xl sm:text-2xl md:text-3xl font-black text-primary"
                  variants={floatingVariants}
                  animate="animate"
                  style={{ animationDelay: `${i * 0.5}s` }}
                >
                  {stat.num}
                </motion.div>
                <div className="text-xs sm:text-sm text-secondary-foreground/60">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-secondary-foreground/30 flex justify-center pt-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
