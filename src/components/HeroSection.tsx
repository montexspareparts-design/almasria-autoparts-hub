import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import heroPart from "@/assets/hero-toyota-part.png";

/**
 * Luxury Hero — inspired by premium product brands (Rolex / high-end perfume).
 * Full-viewport carbon black background, massive display typography behind the
 * floating Toyota part, glowing red CTA.
 */
const HeroSection = () => {
  return (
    <section
      className="relative w-full bg-carbon overflow-hidden"
      style={{ minHeight: "100vh" }}
      aria-label="قطع غيار تويوتا الأصلية"
    >
      {/* Subtle ambient red gradient layer */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 55%, hsl(353 92% 48% / 0.18) 0%, transparent 60%)",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(0 0% 0% / 0.7) 100%)",
        }}
      />

      {/* Top red hairline */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-70" />

      <div className="relative z-10 container mx-auto px-4 pt-28 md:pt-32 pb-16 flex flex-col items-center justify-center min-h-screen">
        {/* MASSIVE display backdrop text */}
        <h2
          aria-hidden
          dir="ltr"
          className="font-display font-black tracking-tighter text-mega-outline select-none pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
          style={{
            fontSize: "clamp(72px, 14vw, 220px)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          TOYOTA GENUINE
        </h2>

        {/* Floating product with red glow */}
        <div className="relative w-full max-w-[560px] aspect-square mx-auto">
          {/* Red glow halo */}
          <div
            aria-hidden
            className="absolute inset-0 bg-red-glow animate-lux-pulse-glow"
            style={{ filter: "blur(40px)" }}
          />
          {/* Gold orbit ring (subtle) */}
          <div
            aria-hidden
            className="absolute inset-[15%] rounded-full border border-[hsl(var(--gold)/0.15)]"
          />
          <img
            src={heroPart}
            alt="فلتر زيت تويوتا الأصلي"
            width={1024}
            height={1024}
            fetchPriority="high"
            decoding="async"
            className="relative w-full h-full object-contain animate-lux-float drop-shadow-2xl"
            style={{ filter: "drop-shadow(0 30px 40px hsl(0 0% 0% / 0.6))" }}
          />
        </div>

        {/* Headline overlay (below product) */}
        <div className="relative text-center mt-8 md:mt-10 max-w-3xl animate-lux-fade-up">
          {/* Gold authenticity badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.06)] backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-gold" />
            <span className="text-gold font-tajawal font-bold text-sm tracking-wide">
              موزع تويوتا المعتمد رسمياً
            </span>
          </div>

          <h1
            className="font-tajawal font-black text-white leading-[1.05]"
            style={{ fontSize: "clamp(36px, 6vw, 68px)" }}
          >
            قطع غيار تويوتا{" "}
            <span className="text-toyota-red">الأصلية</span>
          </h1>

          {/* Red divider */}
          <div className="flex items-center justify-center gap-3 my-5">
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-toyota-red" />
            <span className="w-1.5 h-1.5 rounded-full bg-toyota-red shadow-red-glow" />
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-toyota-red" />
          </div>

          <p className="font-tajawal font-medium text-soft text-lg md:text-2xl tracking-wide">
            ضمان الجودة. ضمان الأمان.{" "}
            <span className="text-white font-bold">ضمان تويوتا.</span>
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/parts-by-type"
              className="group relative inline-flex items-center gap-3 px-9 py-4 rounded-full bg-toyota-red text-white font-tajawal font-black text-lg shadow-red-glow transition-all duration-300 hover:scale-105 hover:shadow-[0_0_80px_hsl(var(--toyota-red)/0.7)]"
            >
              <span>تسوّق الآن</span>
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-white/20 pointer-events-none" />
            </Link>
            <Link
              to="/genuine-parts"
              className="font-tajawal font-bold text-white/70 hover:text-white text-base px-6 py-3 border-b border-transparent hover:border-toyota-red transition-all"
            >
              تعرّف على ضمان الأصالة →
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom red hairline */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-70" />
    </section>
  );
};

export default HeroSection;
