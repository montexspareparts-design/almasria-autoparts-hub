import { ShieldCheck, Package, MapPin, Cog, LayoutDashboard, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import heroBg from "@/assets/hero-corporate.webp";
import HeroLeadCapture from "@/components/HeroLeadCapture";

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
  const isMobile = useIsMobile();
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  // Load video after idle
  useEffect(() => {
    const delay = isMobile ? 3000 : 1500;
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => setShouldLoadVideo(true), { timeout: delay })
      : setTimeout(() => setShouldLoadVideo(true), delay) as unknown as number;
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [isMobile]);

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
    enabled: true,
  });

  const videoSrc = heroVideoUrl || "/videos/hero-cinematic-v3.mp4";

  const stats = [
    { value: 25, suffix: "+", label: t("hero.stat_years") },
    { value: 48, suffix: "h", label: t("hero.stat_delivery") },
    { value: 10, suffix: "K+", label: t("hero.stat_parts") },
  ];

  return (
    <section id="hero" className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden">
      {/* Background — no parallax for perf */}
      <div className="absolute inset-0 z-0">
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
        {shouldLoadVideo && (
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
        )}
      </div>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 z-[1]" style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0.92) 100%)"
      }} />
      <div className="absolute inset-0 z-[1]" style={{
        background: "linear-gradient(to left, transparent 30%, rgba(0,0,0,0.5) 100%)"
      }} />
      <div className="absolute inset-0 z-[1] opacity-30" style={{
        background: "radial-gradient(ellipse at 80% 80%, hsl(var(--primary) / 0.15), transparent 60%)"
      }} />

      {/* Corner accent glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] z-[2] animate-fade-in">
        <div className="w-full h-full bg-gradient-to-bl from-primary/8 via-transparent to-transparent" />
      </div>

      {/* ── Main Content ── */}
      <div className="container mx-auto px-4 md:px-6 relative z-10 pb-8 md:pb-12 animate-fade-in">
        <div className="max-w-[820px]">
          {/* Accent line */}
          <div className="w-14 h-[3px] bg-gradient-to-r from-primary to-primary/40 rounded-full mb-7" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 border border-white/10 rounded-full px-5 py-2.5 mb-8 bg-white/[0.06]">
            <Cog className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: "10s" }} />
            <span className="text-[13px] font-bold text-white/80 tracking-wider uppercase">
              {t("hero.badge")}
            </span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-[1.75rem] sm:text-[2rem] md:text-[2.75rem] lg:text-[3.5rem] font-black text-white leading-[1.45] md:leading-[1.4] tracking-tight mb-6">
            <span className="inline-block">{t("hero.title1")}</span>
            <br />
            <span className="inline-block">{t("hero.title2")} </span>
            <span className="inline-block relative">
              <span className="relative z-10 text-primary" style={{ textShadow: "0 0 20px hsl(var(--primary) / 0.3)" }}>
                {t("hero.title3")}
              </span>
              <span className="absolute -bottom-1.5 left-0 right-0 h-[5px] bg-primary/15 rounded-full" />
            </span>
            <span className="inline-block"> {t("hero.title4")}</span>
          </h1>

          {/* Description */}
          <p
            className="text-white/70 text-[15px] md:text-[1.1rem] leading-[2] max-w-[640px] mb-10 font-medium animate-fade-in"
            style={{ animationDelay: "0.3s", animationFillMode: "both" }}
            dangerouslySetInnerHTML={{ __html: t("hero.desc") }}
          />

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-12 animate-fade-in" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
            {isDealer ? (
              <>
                <Button
                  size="lg"
                  className="text-[15px] px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 w-full sm:w-auto shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.4)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 active:scale-[0.97]"
                  asChild
                >
                  <Link to="/dealer">
                    <LayoutDashboard className="w-5 h-5" />
                    {t("hero.dealer_dashboard") || "لوحة التحكم"}
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-[15px] px-8 py-6 gap-2.5 font-bold border border-white/10 text-white bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/20 transition-all duration-300 w-full sm:w-auto cursor-pointer hover:-translate-y-0.5 active:scale-[0.97]"
                  asChild
                >
                  <Link to="/products">
                    <ShoppingCart className="w-5 h-5" />
                    {t("hero.quick_order") || "اطلب الآن"}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  className="text-[15px] px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 w-full sm:w-auto shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.4)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 active:scale-[0.97]"
                  asChild
                >
                  <Link to="/products">
                    <Package className="w-5 h-5" />
                    {t("hero.browse_products")}
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-[15px] px-8 py-6 gap-2.5 font-bold border border-white/10 text-white bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/20 transition-all duration-300 w-full sm:w-auto cursor-pointer hover:-translate-y-0.5 active:scale-[0.97]"
                  onClick={() => document.getElementById("coverage")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <MapPin className="w-5 h-5" />
                  {t("hero.our_branches")}
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-0 animate-fade-in" style={{ animationDelay: "0.7s", animationFillMode: "both" }}>
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
          </div>
        </div>
      </div>

      {/* Bottom red accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20">
        <div className="w-full h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center animate-fade-in" style={{ animationDelay: "2s", animationFillMode: "both" }}>
        <div className="w-6 h-9 rounded-full border-2 border-white/15 flex items-start justify-center p-1.5">
          <div className="w-1 h-2 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
