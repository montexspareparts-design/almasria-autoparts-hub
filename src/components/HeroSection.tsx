import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import heroBg from "@/assets/hero-warehouse.jpg";

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.82, 0.95]);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img src={heroBg} alt="مستودع قطع غيار تويوتا" className="w-full h-full object-cover scale-110" loading="eager" />
        <motion.div className="absolute inset-0 bg-gradient-to-l from-secondary/95 via-secondary/85 to-secondary/60" style={{ opacity: overlayOpacity }} />
      </motion.div>

      {/* Decorative glows */}
      <motion.div
        className="absolute top-20 left-10 w-40 h-40 rounded-full bg-primary/8 blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="container mx-auto px-4 relative z-10 pt-20 md:pt-28 pb-8">
        <motion.div className="max-w-3xl" variants={staggerContainer} initial="hidden" animate="show">
          {/* Badge */}
          <motion.div
            variants={fadeSlideUp}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 mb-6"
          >
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold text-primary">موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeSlideUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-secondary-foreground leading-[1.2] mb-6 tracking-tight"
          >
            المصرية جروب
            <br />
            <span className="text-gradient-red text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold">موزع معتمد لقطع غيار تويوتا</span>
            <br />
            <span className="text-secondary-foreground/90 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">الأصلية والزيوت في مصر</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeSlideUp}
            className="text-secondary-foreground/70 text-base md:text-lg max-w-2xl leading-relaxed mb-8"
          >
            خبرة 25 عامًا في توزيع قطع الغيار والزيوت الأصلية وشبكة توزيع تغطي جميع محافظات مصر.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeSlideUp} className="flex flex-col sm:flex-row gap-4">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="text-lg px-8 gap-2 red-glow font-bold" asChild>
                <a href="#products">
                  <Search className="w-5 h-5" />
                  اكتشف منتجاتنا
                </a>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="text-lg px-8 gap-2 border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10 bg-transparent border"
                asChild
              >
                <a href="https://wa.me/201020412358" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                  تواصل معنا
                </a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Brand tags */}
          <motion.div variants={fadeSlideUp} className="flex flex-wrap items-center gap-2 sm:gap-3 mt-8">
            {["قطع غيار تويوتا أصلي", "زيوت تويوتا أصلي", "MTX Aftermarket"].map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.12, type: "spring", stiffness: 120 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-secondary-foreground/90 text-sm px-5 py-2 rounded-full"
              >
                {tag}
              </motion.span>
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
          <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ y: [0, 12, 0] }} transition={{ duration: 2, repeat: Infinity }} />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
