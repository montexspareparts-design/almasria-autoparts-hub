import { ArrowLeft, Info, ChevronDown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import heroPart from "@/assets/hero-toyota-part.png";

/**
 * Luxury Hero — Rolex / premium product feel.
 * Carbon black, animated grid, floating particles, marquee backdrop text,
 * spinning gold ring around the product, shimmer CTA.
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

  return (
    <section
      id="hero"
      className="relative w-full bg-carbon overflow-hidden"
      style={{ minHeight: "100vh" }}
      aria-label="قطع غيار تويوتا الأصلية"
    >
      {/* Animated grid */}
      <div aria-hidden className="absolute inset-0 lux-grid-bg animate-lux-grid-pan opacity-60 hidden md:block" />

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
          {/* Floating part-number chip (top-left over filter) */}
          <div className="absolute top-4 left-4 md:top-8 md:left-10 px-3 py-1.5 rounded-full bg-carbon/85 backdrop-blur-md border border-toyota-red/50 shadow-red-glow animate-lux-stagger-in"
               style={{ animationDelay: "0.6s" }}>
            <span dir="ltr" className="font-display font-black text-xs md:text-sm text-white tracking-wider">
              PART # <span className="text-toyota-red">90915-YZZN2</span>
            </span>
          </div>
          {/* OEM / QUALITY GRADE A callout (top-right, near spark plug) */}
          <div className="hidden sm:block absolute top-10 right-2 md:top-14 md:right-6 text-right animate-lux-stagger-in"
               style={{ animationDelay: "0.75s" }}>
            <div dir="ltr" className="font-display font-black text-[10px] md:text-xs tracking-[0.25em] text-white/90">
              <span className="text-toyota-red">✓</span> O E M
            </div>
            <div dir="ltr" className="font-display font-black text-[10px] md:text-xs tracking-[0.2em] text-white/70 mt-0.5">
              +QUALITY GRADE A
            </div>
          </div>
          {/* JAPAN · DENSO · FACTORY SEALED (bottom-left, under filter) */}
          <div className="hidden sm:block absolute bottom-8 left-4 md:bottom-14 md:left-8 animate-lux-stagger-in"
               style={{ animationDelay: "0.85s" }}>
            <div dir="ltr" className="font-display font-black text-[10px] md:text-xs tracking-[0.25em] text-toyota-red">
              JAPAN <span className="text-white/80">◆</span> DENSO
            </div>
            <div dir="ltr" className="font-display font-black text-[10px] md:text-xs tracking-[0.2em] text-white/85 mt-0.5">
              FACTORY SEALED
            </div>
          </div>
          {/* Floating "Iridium" chip (bottom-right, near spark plug) */}
          <div className="hidden sm:block absolute bottom-6 right-2 md:bottom-10 md:right-6 px-3 py-1.5 rounded-full bg-carbon/80 backdrop-blur-md border border-[hsl(var(--gold)/0.5)] animate-lux-stagger-in"
               style={{ animationDelay: "0.95s" }}>
            <span className="font-display font-black text-xs md:text-sm text-gold tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> IRIDIUM SPARK
            </span>
          </div>
        </div>

        {/* Floating diamond decorations */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {[
            { top: "18%", left: "6%", size: 10, delay: "0s" },
            { top: "10%", left: "42%", size: 8, delay: "1.2s" },
            { top: "22%", right: "8%", size: 10, delay: "2.4s" },
            { top: "48%", left: "3%", size: 12, delay: "0.8s" },
            { top: "52%", right: "4%", size: 12, delay: "1.6s" },
            { bottom: "22%", left: "10%", size: 9, delay: "2s" },
            { bottom: "28%", right: "12%", size: 9, delay: "0.4s" },
          ].map((d, i) => (
            <span
              key={i}
              className="absolute border border-white/25 rotate-45"
              style={{
                top: d.top,
                bottom: d.bottom,
                left: d.left,
                right: d.right,
                width: d.size,
                height: d.size,
                animation: `lux-float 6s ease-in-out ${d.delay} infinite`,
              }}
            />
          ))}
        </div>

        {/* Headline overlay (below product) */}
        <div className="relative text-center mt-8 md:mt-10 max-w-3xl">
          {/* Gold authenticity badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-[hsl(var(--gold)/0.45)] bg-[hsl(var(--gold)/0.08)] backdrop-blur-sm animate-lux-badge-pulse animate-lux-stagger-in"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
            </span>
            <span className="text-gold font-tajawal font-bold text-sm tracking-wide">
              موزع تويوتا المعتمد رسمياً
            </span>
          </div>

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
