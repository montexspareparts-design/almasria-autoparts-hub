import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Package, MapPin, Cog, Wrench, Droplets, ChevronDown, LayoutDashboard, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-corporate.webp";

/* ── Floating Mechanical Parts ── */
const floatingParts = [
  { icon: Cog, size: 32, x: "6%", y: "15%", duration: 22, delay: 0, rotate: 360 },
  { icon: Cog, size: 18, x: "88%", y: "20%", duration: 26, delay: 2, rotate: -360 },
  { icon: Wrench, size: 20, x: "82%", y: "68%", duration: 18, delay: 3.5, rotate: 12 },
  { icon: Cog, size: 14, x: "12%", y: "78%", duration: 24, delay: 1.5, rotate: 360 },
  { icon: Droplets, size: 16, x: "94%", y: "42%", duration: 16, delay: 5, rotate: 0 },
  { icon: Cog, size: 22, x: "50%", y: "88%", duration: 28, delay: 0.8, rotate: -360 },
  { icon: Wrench, size: 14, x: "65%", y: "8%", duration: 20, delay: 3, rotate: -15 },
];

const FloatingParticle = ({ part }: { part: typeof floatingParts[0] }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: part.x, top: part.y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 0.1, 0.06, 0.1, 0],
      scale: [0.5, 1, 0.85, 1, 0.5],
      y: [0, -25, 12, -18, 0],
      rotate: [0, part.rotate],
    }}
    transition={{ duration: part.duration, delay: part.delay, repeat: Infinity, ease: "linear" }}
  >
    <part.icon className="text-primary/15" style={{ width: part.size, height: part.size }} strokeWidth={1} />
  </motion.div>
);

/* ── Animated Counter ── */
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
    <span className="font-black text-[1.6rem] md:text-[2rem] text-white tabular-nums tracking-tight">
      {count}{suffix}
    </span>
  );
};

/* ── Hero Section ── */
const HeroSection = () => {
  const { t } = useLanguage();
  const { user, dealerAccount, isDealer } = useAuth();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -50]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  // Defer video loading until after LCP paint
  useEffect(() => {
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => setShouldLoadVideo(true), { timeout: 2000 })
      : setTimeout(() => setShouldLoadVideo(true), 1500) as unknown as number;
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  const { data: heroVideoUrl } = useQuery({
    queryKey: ["site-setting", "hero_video_url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "hero_video_url")
        .maybeSingle();
      return (data?.value as string) || "";
    },
    staleTime: 5 * 60 * 1000,
  });

  const videoSrc = heroVideoUrl || "/__l5e/assets-v1/5c39edf4-c379-40c1-a6e5-ef5982cf04f4/hero-toyota-parts.mp4";

  const stats = [
    { value: 25, suffix: "+", label: t("hero.stat_years") },
    { value: 48, suffix: "h", label: t("hero.stat_delivery") },
    { value: 10, suffix: "K+", label: t("hero.stat_parts") },
  ];

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden">
      {/* Background with parallax */}
      <motion.div className="absolute inset-0 z-0" style={{ scale: bgScale }}>
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
          key={videoSrc}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 pointer-events-none ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          onLoadedData={() => setVideoLoaded(true)}
          onCanPlay={(e) => {
            const vid = e.currentTarget;
            if (vid.paused) vid.play().catch(() => {});
          }}
          webkit-playsinline="true"
          x-webkit-airplay="deny"
          disablePictureInPicture
          disableRemotePlayback
          src={videoSrc}
        />
      </motion.div>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 z-[1]" style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0.92) 100%)"
      }} />
      <div className="absolute inset-0 z-[1]" style={{
        background: "linear-gradient(to left, transparent 30%, rgba(0,0,0,0.5) 100%)"
      }} />
      {/* Subtle red vignette */}
      <div className="absolute inset-0 z-[1] opacity-30" style={{
        background: "radial-gradient(ellipse at 80% 80%, hsl(var(--primary) / 0.15), transparent 60%)"
      }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 z-[2] opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--primary) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.5) 1px, transparent 1px)`,
        backgroundSize: "80px 80px"
      }} />

      {/* Floating particles */}
      <div className="absolute inset-0 z-[3] hidden md:block">
        {floatingParts.map((part, i) => <FloatingParticle key={i} part={part} />)}
      </div>

      {/* Corner accent glow */}
      <motion.div
        className="absolute top-0 right-0 w-[400px] h-[400px] z-[2]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
      >
        <div className="w-full h-full bg-gradient-to-bl from-primary/8 via-transparent to-transparent" />
      </motion.div>

      {/* ── Main Content ── */}
      <motion.div
        className="container mx-auto px-4 md:px-6 relative z-10 pb-8 md:pb-12"
        style={{ opacity: contentOpacity, y: contentY }}
      >
        <div className="max-w-[820px]">
          {/* Accent line */}
          <motion.div
            className="w-14 h-[3px] bg-gradient-to-r from-primary to-primary/40 rounded-full mb-7"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="inline-flex items-center gap-2.5 border border-white/10 rounded-full px-5 py-2.5 mb-8 bg-white/[0.04] backdrop-blur-xl"
          >
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
              <Cog className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-[13px] font-bold text-white/80 tracking-wider uppercase">
              {t("hero.badge")}
            </span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </motion.div>

          {/* Title - no initial hidden state to avoid LCP render delay */}
          <h1
            className="text-[1.75rem] sm:text-[2rem] md:text-[2.75rem] lg:text-[3.5rem] font-black text-white leading-[1.45] md:leading-[1.4] tracking-tight mb-6"
          >
            <span className="inline-block">{t("hero.title1")}</span>
            <br />
            <span className="inline-block">{t("hero.title2")} </span>
            <span className="inline-block relative">
              <span className="relative z-10 text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
                {t("hero.title3")}
              </span>
              <motion.span
                className="absolute -bottom-1.5 left-0 right-0 h-[5px] bg-primary/15 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ originX: 0 }}
              />
            </span>
            <span className="inline-block"> {t("hero.title4")}</span>
          </h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-white/70 text-[15px] md:text-[1.1rem] leading-[2] max-w-[640px] mb-10 font-medium"
            dangerouslySetInnerHTML={{ __html: t("hero.desc") }}
          />

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="flex flex-col sm:flex-row gap-3 mb-12"
          >
            {isDealer ? (
              <>
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="text-[15px] px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 w-full sm:w-auto shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.4)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)]"
                    asChild
                  >
                    <Link to="/dealer">
                      <LayoutDashboard className="w-5 h-5" />
                      {t("hero.dealer_dashboard") || "لوحة التحكم"}
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-[15px] px-8 py-6 gap-2.5 font-bold border border-white/10 text-white bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 w-full sm:w-auto cursor-pointer"
                    asChild
                  >
                    <Link to="/products">
                      <ShoppingCart className="w-5 h-5" />
                      {t("hero.quick_order") || "اطلب الآن"}
                    </Link>
                  </Button>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="text-[15px] px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 w-full sm:w-auto shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.4)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)]"
                    asChild
                  >
                    <Link to="/products">
                      <Package className="w-5 h-5" />
                      {t("hero.browse_products")}
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-[15px] px-8 py-6 gap-2.5 font-bold border border-white/10 text-white bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 w-full sm:w-auto cursor-pointer"
                    onClick={() => document.getElementById("coverage")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    <MapPin className="w-5 h-5" />
                    {t("hero.our_branches")}
                  </Button>
                </motion.div>
              </>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            className="flex items-center gap-0"
          >
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-center">
                <div className="flex flex-col items-center px-5 md:px-7">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} delay={1.3 + i * 0.3} />
                  <span className="text-white/35 text-[11px] md:text-xs mt-1.5 font-semibold tracking-wide">
                    {stat.label}
                  </span>
                </div>
                {i < stats.length - 1 && (
                  <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
                )}
              </div>
            ))}

            {/* Animated dots */}
            <motion.div
              className="hidden md:flex items-center gap-1.5 mr-auto pr-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/30"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.5, delay: i * 0.35, repeat: Infinity }}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom red accent line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px] z-20"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ originX: 0 }}
      >
        <div className="w-full h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
      >
        <motion.div
          className="w-6 h-9 rounded-full border-2 border-white/15 flex items-start justify-center p-1.5"
        >
          <motion.div
            className="w-1 h-2 bg-primary rounded-full"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
