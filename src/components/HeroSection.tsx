import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Search, MessageCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";
import heroBg from "@/assets/hero-warehouse.jpg";

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.3 } },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 50, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const CountUp = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count}{suffix}</>;
};

const stats = [
  { value: 25, suffix: "+", label: "سنة خبرة" },
  { value: 2000, suffix: "+", label: "عميل" },
  { value: 960, suffix: "+", label: "صنف أصلي" },
  { value: 48, suffix: "h", label: "تسليم سريع" },
];

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.82, 0.95]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img src={heroBg} alt="مستودع قطع غيار تويوتا" className="w-full h-full object-cover scale-110" loading="eager" />
        <motion.div className="absolute inset-0 bg-gradient-to-l from-secondary/95 via-secondary/85 to-secondary/60" style={{ opacity: overlayOpacity }} />
      </motion.div>

      {/* Animated particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{ left: `${15 + i * 15}%`, top: `${20 + i * 10}%` }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.7 }}
        />
      ))}

      {/* Decorative glows */}
      <motion.div
        className="absolute top-20 left-10 w-60 h-60 rounded-full bg-primary/10 blur-[100px]"
        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 right-20 w-40 h-40 rounded-full bg-[hsl(var(--gold-accent))]/10 blur-[80px]"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, delay: 1 }}
      />

      <motion.div className="container mx-auto px-4 relative z-10 pt-20 md:pt-28 pb-8" style={{ y: contentY }}>
        <motion.div className="max-w-3xl" variants={staggerContainer} initial="hidden" animate="show">
          {/* Badge */}
          <motion.div
            variants={fadeSlideUp}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm"
          >
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold text-primary">موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية</span>
          </motion.div>

          {/* Title with letter animation */}
          <motion.h1
            variants={fadeSlideUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-secondary-foreground leading-[1.2] mb-6 tracking-tight"
          >
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              المصرية جروب
            </motion.span>
            <br />
            <motion.span
              className="text-gradient-red text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              موزع معتمد لقطع غيار تويوتا
            </motion.span>
            <br />
            <motion.span
              className="text-secondary-foreground/90 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              الأصلية والزيوت في مصر
            </motion.span>
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
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="text-lg px-10 py-6 gap-3 font-bold relative overflow-hidden group bg-gradient-to-l from-primary to-[hsl(355,80%,55%)] text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:shadow-2xl transition-shadow duration-300" asChild>
                <a href="/#brands">
                  <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                  <Search className="w-5 h-5" />
                  اكتشف منتجاتنا
                </a>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="text-lg px-10 py-6 gap-3 font-bold border-2 border-secondary-foreground/25 text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary bg-transparent backdrop-blur-sm transition-all duration-300"
                asChild
              >
                <a href="/contact">
                  <Search className="w-5 h-5" />
                  تواصل معنا
                </a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats counter row */}
          <motion.div
            variants={fadeSlideUp}
            className="grid grid-cols-4 gap-4 mt-10 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + i * 0.15 }}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-primary">
                  <CountUp target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs sm:text-sm text-secondary-foreground/60 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs text-secondary-foreground/40">اكتشف المزيد</span>
        <ChevronDown className="w-5 h-5 text-secondary-foreground/40" />
      </motion.div>
    </section>
  );
};

export default HeroSection;
