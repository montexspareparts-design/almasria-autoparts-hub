import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Package, MapPin, Cog, Wrench, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-corporate.webp";

/* ── Floating Auto Parts Particles ── */
const floatingParts = [
  { icon: Cog, size: 28, x: "8%", y: "18%", duration: 18, delay: 0, rotate: 360 },
  { icon: Cog, size: 20, x: "85%", y: "25%", duration: 22, delay: 1.5, rotate: -360 },
  { icon: Wrench, size: 22, x: "78%", y: "65%", duration: 16, delay: 3, rotate: 15 },
  { icon: Cog, size: 16, x: "15%", y: "72%", duration: 20, delay: 2, rotate: 360 },
  { icon: Droplets, size: 18, x: "92%", y: "45%", duration: 14, delay: 4, rotate: 0 },
  { icon: Cog, size: 24, x: "45%", y: "85%", duration: 24, delay: 0.5, rotate: -360 },
  { icon: Wrench, size: 16, x: "62%", y: "12%", duration: 19, delay: 2.5, rotate: -20 },
];

const FloatingParticle = ({ part }: { part: typeof floatingParts[0] }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: part.x, top: part.y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 0.12, 0.08, 0.12, 0],
      scale: [0.5, 1, 0.8, 1, 0.5],
      y: [0, -20, 10, -15, 0],
      rotate: [0, part.rotate],
    }}
    transition={{ duration: part.duration, delay: part.delay, repeat: Infinity, ease: "linear" }}
  >
    <part.icon className="text-primary/20" style={{ width: part.size, height: part.size }} strokeWidth={1} />
  </motion.div>
);

/* ── Animated Red Line ── */
const RedAccentLine = () => (
  <motion.div
    className="absolute bottom-0 left-0 right-0 h-[3px] z-20"
    initial={{ scaleX: 0 }}
    animate={{ scaleX: 1 }}
    transition={{ duration: 1.2, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
    style={{ originX: 0 }}
  >
    <div className="w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent" />
  </motion.div>
);

/* ── Stats Counter ── */
const stats = [
  { value: 25, suffix: "+", label: "سنة خبرة" },
  { value: 48, suffix: "h", label: "تسليم سريع" },
  { value: 10, suffix: "K+", label: "قطعة متوفرة" },
];

const AnimatedCounter = ({ value, suffix, delay }: { value: number; suffix: string; delay: number }) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let current = 0;
    const step = Math.max(1, Math.floor(value / 40));
    const interval = setInterval(() => {
      current += step;
      if (current >= value) { setCount(value); clearInterval(interval); }
      else setCount(current);
    }, 35);
    return () => clearInterval(interval);
  }, [started, value]);

  return (
    <span className="font-black text-2xl md:text-3xl text-white tabular-nums">
      {count}{suffix}
    </span>
  );
};

/* ── Trust Marquee Strip ── */
const trustItems = [
  "قطع غيار 100% أصلية",
  "ضمان وكالة على جميع المنتجات",
  "توصيل خلال 48 ساعة",
  "+25 سنة خبرة في السوق",
  "تغطية جميع محافظات مصر",
  "أسعار تنافسية للتجار",
  "دعم فني متخصص",
  "موزع معتمد رسمي",
];

const TrustMarquee = () => (
  <div className="relative bg-primary overflow-hidden z-20">
    <motion.div
      className="flex items-center gap-8 whitespace-nowrap py-3"
      animate={{ x: ["0%", "-50%"] }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
    >
      {[...trustItems, ...trustItems].map((item, i) => (
        <div key={`${item}-${i}`} className="flex items-center gap-4 shrink-0">
          <span className="text-primary-foreground font-bold text-sm tracking-wide">{item}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/40" />
        </div>
      ))}
    </motion.div>
  </div>
);

/* ── Main Hero ── */
const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -40]);
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <>
      <section
        ref={sectionRef}
        id="hero"
        className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col justify-center overflow-hidden"
      >
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          {/* Fallback image (shows while video loads) */}
          <img
            src={heroBg}
            alt=""
            width={1920}
            height={1080}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-0" : "opacity-100"}`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Multi-layer cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/85 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-[1]" />
        
        {/* Vignette */}
        <div className="absolute inset-0 z-[1]" style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)"
        }} />

        {/* Animated grid pattern */}
        <motion.div
          className="absolute inset-0 z-[2] opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ duration: 2, delay: 0.5 }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0 z-[3] hidden md:block">
          {floatingParts.map((part, i) => (
            <FloatingParticle key={i} part={part} />
          ))}
        </div>

        {/* Corner accent */}
        <motion.div
          className="absolute top-0 right-0 w-[300px] h-[300px] z-[2]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.8 }}
        >
          <div className="w-full h-full bg-gradient-to-bl from-primary/10 via-transparent to-transparent" />
        </motion.div>

        {/* Content */}
        <motion.div
          className="container mx-auto px-4 relative z-10 pt-28 md:pt-36 pb-16"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          <div className="max-w-[800px]">
            {/* Red accent line */}
            <motion.div
              className="w-12 h-[3px] bg-primary rounded-full mb-6"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="inline-flex items-center gap-2.5 border border-primary/30 rounded-full px-5 py-2.5 mb-8 bg-primary/5 backdrop-blur-md"
            >
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
                <Cog className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-sm font-bold text-white/90 tracking-wide">موزّع معتمد — تويوتا</span>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="text-[1.75rem] sm:text-3xl md:text-[2.75rem] lg:text-[3.25rem] font-black text-white leading-[1.5] md:leading-[1.45] tracking-tight mb-6"
            >
              <span className="inline-block">المصرية جروب</span>
              <br />
              <span className="inline-block">موزع معتمد لقطع&nbsp;غيار{" "}</span>
              <motion.span
                className="inline-block relative"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <span className="relative z-10 text-primary">تويوتا&nbsp;الأصلية</span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-[6px] bg-primary/20 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ originX: 0 }}
                />
              </motion.span>
              <span className="inline-block"> في&nbsp;مصر</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="text-white/70 text-base md:text-lg leading-[1.85] max-w-[660px] mb-10"
            >
              خبرة تتجاوز 25 عامًا في التوزيع المؤسسي، شبكة تغطي جميع المحافظات مع تسليم خلال 48&nbsp;ساعة، وعلامتنا MTX بجودة تضاهي المواصفات&nbsp;الأصلية.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3 mb-10"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="text-base px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
                  asChild
                >
                  <Link to="/products"><Package className="w-5 h-5" />تصفّح المنتجات</Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 gap-2.5 font-bold border border-white/15 text-white bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/25 transition-all duration-300 w-full sm:w-auto"
                  asChild
                >
                  <Link to="/#coverage"><MapPin className="w-5 h-5" />فروعنا وانتشارنا</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="flex items-center gap-6 md:gap-10"
            >
              {stats.map((stat, i) => (
                <div key={stat.label} className="flex flex-col items-center md:items-start">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} delay={1.2 + i * 0.3} />
                  <span className="text-white/40 text-xs md:text-sm mt-1 font-medium">{stat.label}</span>
                </div>
              ))}
              <motion.div
                className="hidden md:flex items-center gap-1.5 mr-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary/40"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        <RedAccentLine />

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.8 }}
        >
          <motion.div className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center p-1">
            <motion.div
              className="w-1 h-2 bg-primary rounded-full"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Trust Marquee strip */}
      <TrustMarquee />
    </>
  );
};

export default HeroSection;
