import { ArrowLeft, Info, ChevronDown, Sparkles, ShieldCheck, Truck, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import heroPart from "@/assets/hero-toyota-part.png";
import brandLogo from "@/assets/almasria-logo.png";

/**
 * Luxury Hero — Rolex / premium product feel.
 * Carbon black, animated grid, floating particles, marquee backdrop text,
 * spinning gold ring around the product, shimmer CTA, corner brackets,
 * stats strip, trust chips, vertical side captions.
 */
const HeroSection = () => {
  // pre-generate particle positions (stable per mount)
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        left: `${(i * 53) % 100}%`,
        delay: `${(i * 0.7) % 14}s`,
        duration: `${10 + ((i * 1.3) % 10)}s`,
        size: 2 + (i % 3),
      })),
    []
  );

  // gold sparkle stars scattered around hero
  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        top: `${(i * 37 + 8) % 90}%`,
        left: `${(i * 71 + 5) % 95}%`,
        delay: `${(i * 0.4) % 4}s`,
        size: 6 + (i % 3) * 2,
      })),
    []
  );

  // floating geometric shards (small rotated squares)
  const shards = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        top: `${(i * 43 + 15) % 85}%`,
        left: `${(i * 61 + 10) % 90}%`,
        delay: `${(i * 0.9) % 6}s`,
        size: 8 + (i % 3) * 4,
        rot: (i * 47) % 360,
      })),
    []
  );


  return (
    <section
      id="hero"
      className="relative w-full bg-carbon overflow-hidden"
      style={{ minHeight: "100vh" }}
      aria-label="قطع غيار تويوتا الأصلية"
    >
      {/* Animated grid */}
      <div aria-hidden className="absolute inset-0 lux-grid-bg animate-lux-grid-pan opacity-60" />

      {/* Ambient red gradient */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 55%, hsl(353 92% 48% / 0.22) 0%, transparent 60%)",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(0 0% 0% / 0.75) 100%)",
        }}
      />

      {/* Floating particles */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full bg-toyota-red"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animation: `lux-particle ${p.duration} linear ${p.delay} infinite`,
              boxShadow: "0 0 8px hsl(var(--toyota-red) / 0.8)",
            }}
          />
        ))}
      </div>

      {/* Top red hairline */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-80" />

      {/* Corner brackets — premium framing */}
      <div aria-hidden className="pointer-events-none absolute inset-6 md:inset-10 z-20">
        <span className="absolute top-0 left-0 w-6 h-6 border-t border-l border-[hsl(var(--gold)/0.55)]" />
        <span className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[hsl(var(--gold)/0.55)]" />
        <span className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[hsl(var(--gold)/0.55)]" />
        <span className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[hsl(var(--gold)/0.55)]" />
      </div>

      {/* Vertical side captions */}
      <div aria-hidden className="hidden lg:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-3 text-soft">
        <span className="h-16 w-px bg-gradient-to-b from-transparent via-toyota-red/60 to-transparent" />
        <span className="font-display font-bold text-[10px] tracking-[0.4em] [writing-mode:vertical-rl] rotate-180">EST · 1985 · CAIRO</span>
        <span className="h-16 w-px bg-gradient-to-b from-toyota-red/60 via-transparent to-transparent" />
      </div>
      <div aria-hidden className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-3 text-soft">
        <span className="h-16 w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent" />
        <span className="font-display font-bold text-[10px] tracking-[0.4em] [writing-mode:vertical-rl]">TOYOTA · GENUINE · OEM</span>
        <span className="h-16 w-px bg-gradient-to-b from-gold/60 via-transparent to-transparent" />
      </div>

      {/* === CINEMATIC LAYERS === */}

      {/* Diagonal red scan beam — sweeps across the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden z-[5]">
        <div
          className="absolute -top-1/2 left-0 h-[200%] w-[18%] animate-lux-scan-beam"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--toyota-red) / 0.08) 35%, hsl(var(--toyota-red) / 0.35) 50%, hsl(var(--toyota-red) / 0.08) 65%, transparent 100%)",
            filter: "blur(2px)",
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* Lens flare pinpoint */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[28%] left-[62%] z-[6] w-[420px] h-[420px] rounded-full animate-lux-flare"
        style={{
          background:
            "radial-gradient(circle, hsl(44 90% 70% / 0.35) 0%, hsl(var(--toyota-red) / 0.12) 30%, transparent 65%)",
          filter: "blur(28px)",
          transform: "translate(-50%,-50%)",
        }}
      />

      {/* Gold sparkle stars */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[6]">
        {sparkles.map((s, i) => (
          <Sparkles
            key={`sp-${i}`}
            className="absolute text-gold/70 animate-lux-twinkle"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              filter: "drop-shadow(0 0 6px hsl(var(--gold) / 0.7))",
            }}
          />
        ))}
      </div>

      {/* Floating geometric shards */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
        {shards.map((s, i) => (
          <span
            key={`sh-${i}`}
            className="absolute block border border-toyota-red/30 animate-lux-shard"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              transform: `rotate(${s.rot}deg)`,
              animationDelay: s.delay,
              boxShadow: "0 0 12px hsl(var(--toyota-red) / 0.4)",
            }}
          />
        ))}
      </div>

      {/* Edge ticker — top */}
      <div aria-hidden className="pointer-events-none absolute top-3 inset-x-0 z-[7] overflow-hidden h-5 opacity-40">
        <div className="flex whitespace-nowrap animate-lux-ticker font-display font-black text-[10px] tracking-[0.5em] text-soft">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex items-center gap-6 px-6" dir="ltr">
              <span className="text-toyota-red">●</span> TOYOTA GENUINE PARTS
              <span className="text-gold">◆</span> OEM CERTIFIED
              <span className="text-toyota-red">●</span> MADE IN JAPAN
              <span className="text-gold">◆</span> EST · 1985 · CAIRO
              <span className="text-toyota-red">●</span> AUTHORIZED DISTRIBUTOR
              <span className="text-gold">◆</span> AL MASRIA GROUP
              <span className="text-toyota-red">●</span> NATIONWIDE SHIPPING
              <span className="text-gold">◆</span> 100% AUTHENTIC
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-28 md:pt-32 pb-20 flex flex-col items-center justify-center min-h-screen">
        {/* MARQUEE backdrop text — slow horizontal scroll */}
        <div
          aria-hidden
          className="pointer-events-none select-none absolute top-1/2 left-1/2 w-[260vw] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap animate-lux-marquee"
        >
          <span
            dir="ltr"
            className="font-display font-black tracking-tighter text-mega-outline"
            style={{ fontSize: "clamp(72px, 14vw, 220px)", letterSpacing: "-0.04em" }}
          >
            TOYOTA GENUINE PARTS · TOYOTA GENUINE PARTS · TOYOTA GENUINE PARTS ·
          </span>
        </div>

        {/* Product with concentric rings + glow */}
        <div className="relative w-full max-w-[640px] aspect-[3/2] mx-auto animate-lux-stagger-in">
          {/* Red glow halo */}
          <div
            aria-hidden
            className="absolute inset-[10%] bg-red-glow animate-lux-pulse-glow"
            style={{ filter: "blur(50px)" }}
          />
          {/* Spinning gold ring */}
          <div
            aria-hidden
            className="absolute inset-[8%] rounded-full border border-dashed border-[hsl(var(--gold)/0.25)] animate-lux-ring-spin"
          />
          <div
            aria-hidden
            className="absolute inset-[18%] rounded-full border border-[hsl(var(--toyota-red)/0.18)]"
          />
          {/* Highlight arc */}
          <div
            aria-hidden
            className="absolute inset-[5%] rounded-full"
            style={{
              background:
                "conic-gradient(from 200deg, transparent 0deg, hsl(var(--toyota-red) / 0.15) 60deg, transparent 120deg)",
              filter: "blur(20px)",
            }}
          />
          <img
            src={heroPart}
            alt="فلتر زيت تويوتا YZZN2 الأصلي + شمعة إيريديوم"
            width={1536}
            height={1024}
            fetchPriority="high"
            decoding="async"
            className="relative w-full h-full object-contain animate-lux-float"
            style={{ filter: "drop-shadow(0 30px 50px hsl(0 0% 0% / 0.7))" }}
          />
          {/* Floating part-number chip (over filter - left) */}
          <div className="absolute top-4 left-2 md:top-8 md:left-6 px-3 py-1.5 rounded-full bg-carbon/80 backdrop-blur-md border border-toyota-red/40 shadow-red-glow animate-lux-stagger-in"
               style={{ animationDelay: "0.6s" }}>
          <span className="font-display font-black text-xs md:text-sm text-white tracking-wider">
            PART # <span className="text-toyota-red">90915-YZZN2</span>
          </span>
          </div>
          {/* Floating "Iridium" chip (over spark plug - right) */}
          <div className="hidden sm:block absolute bottom-6 right-2 md:bottom-10 md:right-6 px-3 py-1.5 rounded-full bg-carbon/80 backdrop-blur-md border border-[hsl(var(--gold)/0.5)] animate-lux-stagger-in"
               style={{ animationDelay: "0.9s" }}>
            <span className="font-display font-black text-xs md:text-sm text-gold tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> IRIDIUM SPARK
            </span>
          </div>
        </div>

        {/* Headline overlay (below product) */}
        <div className="relative text-center mt-8 md:mt-10 max-w-3xl">



          <h1
            className="font-tajawal font-black text-white leading-[1.05] animate-lux-stagger-in"
            style={{ fontSize: "clamp(36px, 6vw, 68px)", animationDelay: "0.3s" }}
          >
            قطع غيار تويوتا <span className="text-toyota-red">الأصلية</span>
          </h1>

          {/* Red divider */}
          <div
            className="flex items-center justify-center gap-3 my-5 animate-lux-stagger-in"
            style={{ animationDelay: "0.45s" }}
          >
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-toyota-red" />
            <span className="w-1.5 h-1.5 rounded-full bg-toyota-red shadow-red-glow" />
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-toyota-red" />
          </div>

          <p
            className="font-tajawal font-medium text-soft text-lg md:text-2xl tracking-wide animate-lux-stagger-in"
            style={{ animationDelay: "0.6s" }}
          >
            ضمان الجودة. ضمان الأمان.{" "}
            <span className="text-white font-bold">ضمان تويوتا.</span>
          </p>

          {/* CTAs */}
          <div
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-lux-stagger-in"
            style={{ animationDelay: "0.8s" }}
          >
            <Link
              to="/products"
              className="group relative inline-flex items-center gap-3 px-9 py-4 rounded-full bg-toyota-red text-white font-tajawal font-black text-lg overflow-hidden animate-lux-red-pulse transition-transform duration-300 hover:scale-[1.04]"
            >
              {/* shimmer sweep */}
              <span
                aria-hidden
                className="absolute inset-y-0 -inset-x-4 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-lux-shimmer-sweep"
                style={{ width: "40%" }}
              />
              <span className="relative">تسوّق الآن</span>
              <ArrowLeft className="relative w-5 h-5 transition-transform group-hover:-translate-x-1.5" />
              <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-white/25 pointer-events-none" />
            </Link>
            <Link
              to="/about"
              className="group inline-flex items-center gap-2 font-tajawal font-bold text-white/70 hover:text-white text-base px-6 py-3 rounded-full border border-white/15 hover:border-toyota-red/60 backdrop-blur-sm transition-all"
            >
              <Info className="w-4 h-4" />
              <span>من نحن</span>
            </Link>
          </div>




          {/* Trust chips */}
          <div
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-soft text-xs md:text-sm font-tajawal animate-lux-stagger-in"
            style={{ animationDelay: "1.15s" }}
          >
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-gold" /> فاتورة ضريبية</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-gold" /> شحن لكل الجمهورية</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="inline-flex items-center gap-1.5"><Award className="w-4 h-4 text-gold" /> موزع معتمد</span>
          </div>
        </div>


        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-lux-scroll-cue">
          <span className="text-soft text-[10px] tracking-[0.3em] font-display font-bold">SCROLL</span>
          <ChevronDown className="w-4 h-4 text-soft" />
        </div>
      </div>

      {/* Bottom red hairline */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-80" />
    </section>
  );
};

export default HeroSection;
