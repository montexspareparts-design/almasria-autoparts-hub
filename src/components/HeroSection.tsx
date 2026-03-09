import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Package, MapPin, Cog, Wrench, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-corporate.webp";

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

const HeroSection = () => {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -40]);
  const [videoLoaded, setVideoLoaded] = useState(false);

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

  const videoSrc = heroVideoUrl || "/videos/hero-bg.mp4";

  const stats = [
    { value: 25, suffix: "+", label: t("hero.stat_years") },
    { value: 48, suffix: "h", label: t("hero.stat_delivery") },
    { value: 10, suffix: "K+", label: t("hero.stat_parts") },
  ];

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={heroBg} alt="" width={1920} height={1080} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-0" : "opacity-100"}`} loading="eager" decoding="async" fetchPriority="high" />
        <video
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 pointer-events-none ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoLoaded(true)}
          webkit-playsinline="true"
          x-webkit-airplay="deny"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/85 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-[1]" />
      <div className="absolute inset-0 z-[1]" style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)" }} />

      <div className="absolute inset-0 z-[2] opacity-[0.03]" style={{ backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

      <div className="absolute inset-0 z-[3] hidden md:block">
        {floatingParts.map((part, i) => <FloatingParticle key={i} part={part} />)}
      </div>

      <motion.div className="absolute top-0 right-0 w-[300px] h-[300px] z-[2]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.8 }}>
        <div className="w-full h-full bg-gradient-to-bl from-primary/10 via-transparent to-transparent" />
      </motion.div>

      <motion.div className="container mx-auto px-4 relative z-10 pt-28 md:pt-36 pb-16" style={{ opacity: contentOpacity, y: contentY }}>
        <div className="max-w-[800px]">
          <motion.div className="w-12 h-[3px] bg-primary rounded-full mb-6" initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />

          <motion.div initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.7, delay: 0.3 }} className="inline-flex items-center gap-2.5 border border-primary/30 rounded-full px-5 py-2.5 mb-8 bg-primary/5 backdrop-blur-md">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
              <Cog className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-bold text-white/90 tracking-wide">{t("hero.badge")}</span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }} className="text-[1.75rem] sm:text-3xl md:text-[2.75rem] lg:text-[3.25rem] font-black text-white leading-[1.5] md:leading-[1.45] tracking-tight mb-6">
            <span className="inline-block">{t("hero.title1")}</span><br />
            <span className="inline-block">{t("hero.title2")} </span>
            <motion.span className="inline-block relative" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.8 }}>
              <span className="relative z-10 text-primary">{t("hero.title3")}</span>
              <motion.span className="absolute -bottom-1 left-0 right-0 h-[6px] bg-primary/20 rounded-full" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }} style={{ originX: 0 }} />
            </motion.span>
            <span className="inline-block"> {t("hero.title4")}</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.65 }} className="text-white/85 text-base md:text-[1.15rem] leading-[2] max-w-[680px] mb-10 font-medium" dangerouslySetInnerHTML={{ __html: t("hero.desc") }} />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="flex flex-col sm:flex-row gap-3 mb-10">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="text-base px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35" asChild>
                <Link to="/products"><Package className="w-5 h-5" />{t("hero.browse_products")}</Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2.5 font-bold border border-white/15 text-white bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/25 transition-all duration-300 w-full sm:w-auto cursor-pointer" onClick={() => document.getElementById("coverage")?.scrollIntoView({ behavior: "smooth" })}>
                <MapPin className="w-5 h-5" />{t("hero.our_branches")}
              </Button>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1 }} className="flex items-center gap-6 md:gap-10">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center md:items-start">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} delay={1.2 + i * 0.3} />
                <span className="text-white/40 text-xs md:text-sm mt-1 font-medium">{stat.label}</span>
              </div>
            ))}
            <motion.div className="hidden md:flex items-center gap-1.5 mr-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40" animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }} />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <RedAccentLine />

      <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}>
        <motion.div className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center p-1">
          <motion.div className="w-1 h-2 bg-primary rounded-full" animate={{ y: [0, 10, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
