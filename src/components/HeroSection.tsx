import { ArrowLeft, Star } from "lucide-react";
import { Link } from "react-router-dom";
import heroPart from "@/assets/hero-toyota-part.png";

/**
 * Dark Luxury Automotive Hero — Toyota GR × Apple Store feel.
 * 60/40 split: text + product. Real YZZN2 oil filter as hero subject.
 */
const HeroSection = () => {
  return (
    <section
      id="hero"
      dir="rtl"
      className="relative w-full min-h-screen overflow-hidden"
      style={{ backgroundColor: "hsl(var(--carbon))" }}
      aria-label="قطع غيار تويوتا الأصلية"
    >
      {/* Layer 1: noise grain */}
      <div aria-hidden className="absolute inset-0 bg-noise opacity-[0.04] pointer-events-none" />
      {/* Layer 2: red spotlight */}
      <div aria-hidden className="absolute inset-0 hero-spotlight pointer-events-none" />
      {/* Layer 3: blueprint grid */}
      <div aria-hidden className="absolute inset-0 hero-blueprint pointer-events-none" />

      {/* Mega background word "GENUINE" */}
      <div
        aria-hidden
        className="hidden md:block pointer-events-none select-none absolute inset-0 flex items-center justify-center"
      >
        <span
          dir="ltr"
          className="font-bebas leading-none"
          style={{
            fontSize: "clamp(160px, 22vw, 320px)",
            color: "rgba(255,255,255,0.025)",
            letterSpacing: "-0.02em",
          }}
        >
          GENUINE
        </span>
      </div>

      <div className="relative z-10 container mx-auto px-5 md:px-8 pt-28 md:pt-32 pb-20 min-h-screen flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-6 items-center">
          {/* TEXT — 60% (right in RTL = first in DOM) */}
          <div className="lg:col-span-3 text-right">
            {/* LIVE pill */}
            <div
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full animate-lux-stagger-in"
              style={{
                border: "1px solid rgba(235,10,30,0.3)",
                background: "rgba(235,10,30,0.05)",
              }}
            >
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-toyota-red opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-toyota-red" />
              </span>
              <span className="font-mono-tech text-[11px] tracking-[0.18em] text-toyota-red font-bold">LIVE</span>
              <span className="w-px h-3 bg-white/15" />
              <span className="font-cairo text-[13px] text-white/85">قطع غيار معتمدة رسمياً من تويوتا</span>
            </div>

            {/* Headline */}
            <h1
              className="font-kufi font-black text-white mt-7 animate-lux-stagger-in"
              style={{
                fontSize: "clamp(44px, 8vw, 112px)",
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                animationDelay: "0.1s",
              }}
            >
              <span className="block">قطع غيار</span>
              <span className="block">
                تويوتا <span className="text-toyota-red">الأصلية</span>
              </span>
            </h1>

            {/* Subtext */}
            <p
              className="font-cairo mt-6 max-w-[520px] mr-0 text-base md:text-lg animate-lux-stagger-in"
              style={{
                color: "hsl(var(--text-soft))",
                lineHeight: 1.8,
                animationDelay: "0.25s",
              }}
            >
              كل قطعة نبيعها مضمونة <span className="text-white font-bold">100% من المصنع</span>. مش تقليد. مش غير أصلي. تويوتا فقط.
            </p>

            {/* CTAs */}
            <div
              className="mt-8 flex flex-wrap items-center gap-4 animate-lux-stagger-in"
              style={{ animationDelay: "0.4s" }}
            >
              <Link
                to="/products"
                className="group inline-flex items-center gap-3 font-cairo font-bold text-white text-base transition-all duration-300 hover:scale-[1.03]"
                style={{
                  backgroundColor: "#EB0A1E",
                  padding: "16px 36px",
                  borderRadius: "4px",
                  boxShadow: "0 8px 24px rgba(235,10,30,0.25)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 40px rgba(235,10,30,0.55)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(235,10,30,0.25)")}
              >
                <span>تسوق الآن</span>
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center font-cairo font-bold text-white text-base transition-all duration-300"
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                  padding: "16px 36px",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)";
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                اعرف أكتر
              </Link>
            </div>

            {/* Social proof */}
            <div
              className="mt-8 flex flex-wrap items-center gap-4 text-sm animate-lux-stagger-in"
              style={{ color: "hsl(var(--text-soft))", animationDelay: "0.55s" }}
            >
              <div className="flex items-center gap-1" aria-label="تقييم 5 نجوم">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-current" style={{ color: "hsl(var(--gold))" }} />
                ))}
              </div>
              <span className="text-white/80 font-cairo">
                <span className="font-bebas text-white text-lg align-middle ml-1">+2,400</span>
                عميل راضي
              </span>
              <span className="w-px h-4 bg-white/15" />
              <span className="font-cairo">توصيل لكل مصر</span>
            </div>
          </div>

          {/* PRODUCT — 40% */}
          <div className="lg:col-span-2 relative flex items-center justify-center min-h-[360px] lg:min-h-[560px]">
            {/* Red halo behind */}
            <div
              aria-hidden
              className="absolute inset-[15%] rounded-full animate-lux-pulse-glow"
              style={{
                background: "radial-gradient(circle, rgba(235,10,30,0.35) 0%, transparent 65%)",
                filter: "blur(60px)",
              }}
            />
            {/* Concentric rings */}
            <div
              aria-hidden
              className="absolute inset-[8%] rounded-full border animate-lux-ring-spin"
              style={{ borderColor: "rgba(184,151,42,0.18)", borderStyle: "dashed" }}
            />
            <div
              aria-hidden
              className="absolute inset-[20%] rounded-full border"
              style={{ borderColor: "rgba(235,10,30,0.15)" }}
            />

            <img
              src={heroPart}
              alt="فلتر زيت تويوتا الأصلي 90915-YZZN2 — DENSO"
              width={1024}
              height={1024}
              fetchPriority="high"
              decoding="async"
              className="relative w-[78%] max-w-[460px] h-auto object-contain animate-lux-float"
              style={{
                filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.8)) drop-shadow(0 0 80px rgba(235,10,30,0.2))",
              }}
            />

            {/* OEM verified badge */}
            <div
              className="absolute top-6 right-2 md:top-10 md:right-6 px-3 py-1.5 rounded animate-lux-stagger-in"
              style={{
                backgroundColor: "rgba(6,6,8,0.85)",
                border: "1px solid rgba(0,255,136,0.35)",
                animationDelay: "0.7s",
              }}
            >
              <span className="font-mono-tech text-[11px] font-bold tracking-wider text-verified">
                OEM: 90915-YZZN2 ✓ VERIFIED
              </span>
            </div>

            {/* Gold authenticity chip */}
            <div
              className="absolute bottom-8 left-2 md:bottom-12 md:left-6 px-3 py-1.5 rounded animate-lux-stagger-in"
              style={{
                backgroundColor: "rgba(6,6,8,0.85)",
                border: "1px solid rgba(184,151,42,0.4)",
                animationDelay: "0.85s",
              }}
            >
              <span className="font-mono-tech text-[11px] font-bold tracking-[0.18em] text-gold">
                ✓ TOYOTA GENUINE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom red hairline */}
      <div
        aria-hidden
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(235,10,30,0.7) 50%, transparent 100%)",
        }}
      />
    </section>
  );
};

export default HeroSection;
