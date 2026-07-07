import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft } from "lucide-react";

/**
 * HeroSection — Noomo-Labs inspired.
 *
 * Composition:
 *   - Fullscreen WebGL fluid metaballs (cursor-reactive) as living backdrop
 *   - Massive condensed Arabic display type as the hero
 *   - Mono-typed meta rows in the four corners (timestamp, coordinates)
 *   - Sparse underlined CTA links (not chunky buttons) — Noomo signature
 *   - Bottom scroll strip with live ticker
 *
 * Nothing else. No shards, sparkles, HUD, marquee, or gold rings — the
 * shader carries the visual weight, typography carries the message.
 */

const HeroFluid = lazy(() => import("@/components/hero/HeroFluid"));

const HeroSection = () => {
  return (
    <section
      id="hero"
      dir="rtl"
      className="relative w-full min-h-screen bg-[#050506] text-white overflow-hidden isolate"
      aria-label="قطع غيار تويوتا الأصلية"
    >
      {/* Living backdrop */}
      <Suspense fallback={null}>
        <HeroFluid />
      </Suspense>

      {/* Fine dot-grid overlay — Noomo signature */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.22] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Top-left mono meta */}
      <div
        className="absolute top-24 left-6 md:top-28 md:left-10 z-20 font-mono text-[10px] md:text-[11px] tracking-[0.24em] text-white/55"
        dir="ltr"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-toyota-red animate-pulse" />
          <span>[ AL MASRIA · TOYOTA GENUINE ]</span>
        </div>
        <div className="mt-1.5 text-white/35">EST · 1985 / CAIRO · EGYPT</div>
      </div>

      {/* Top-right mono meta */}
      <div
        className="absolute top-24 right-6 md:top-28 md:right-10 z-20 font-mono text-[10px] md:text-[11px] tracking-[0.24em] text-white/55 text-right"
        dir="ltr"
      >
        <div>[ 30.0444° N / 31.2357° E ]</div>
        <div className="mt-1.5 text-white/35">v.2026 · GENUINE / OEM</div>
      </div>

      {/* CENTER — massive display type */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* eyebrow */}
        <div
          className="font-mono text-[10px] md:text-[11px] tracking-[0.4em] text-white/55 mb-6 md:mb-8"
          dir="ltr"
        >
          [ CHAPTER · 01 ] — SINCE 1985
        </div>

        {/* Line 1 (Arabic) */}
        <h1
          className="font-almarai font-black leading-[0.88] tracking-[-0.04em] text-white"
          style={{ fontSize: "clamp(52px, 10.5vw, 168px)" }}
        >
          قطع غيار تويوتا
        </h1>

        {/* Line 2 — outlined + red word */}
        <div
          className="mt-1 md:mt-2 font-almarai font-black leading-[0.88] tracking-[-0.04em]"
          style={{ fontSize: "clamp(52px, 10.5vw, 168px)" }}
        >
          <span className="text-mega-outline">100%</span>{" "}
          <span className="text-toyota-red">الأصلية</span>
        </div>

        {/* subline */}
        <p
          className="mt-8 md:mt-10 max-w-xl font-plex-ar text-sm md:text-base text-white/60 leading-relaxed"
        >
          موزّع معتمد لقطع غيار تويوتا الأصلية في مصر — منذ أربعين عامًا.
          كل قطعة مختومة من المصنع، مضمونة بضمان الوكيل.
        </p>

        {/* CTAs — Noomo-style underlined links, not buttons */}
        <div className="mt-10 md:mt-14 flex items-center gap-8 md:gap-14" dir="ltr">
          <Link
            to="/products"
            className="group inline-flex items-center gap-3 font-mono text-xs md:text-sm tracking-[0.25em] text-white uppercase relative"
          >
            <span className="relative">
              Shop Now
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-white/70 origin-left scale-x-100 group-hover:scale-x-0 transition-transform duration-500" />
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-toyota-red origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </span>
            <ArrowUpLeft className="w-4 h-4 transition-transform duration-500 group-hover:-translate-x-1 group-hover:-translate-y-1 text-toyota-red" />
          </Link>
          <Link
            to="/about"
            className="group inline-flex items-center gap-3 font-mono text-xs md:text-sm tracking-[0.25em] text-white/60 hover:text-white uppercase relative"
          >
            <span className="relative">
              About Us
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-white/25 group-hover:bg-white/70 transition-colors" />
            </span>
          </Link>
        </div>
      </div>

      {/* Bottom-left mono */}
      <div
        className="absolute bottom-8 left-6 md:bottom-10 md:left-10 z-20 font-mono text-[10px] md:text-[11px] tracking-[0.24em] text-white/45"
        dir="ltr"
      >
        [ SCROLL / EXPLORE ↓ ]
      </div>

      {/* Bottom-right mono */}
      <div
        className="absolute bottom-8 right-6 md:bottom-10 md:right-10 z-20 font-mono text-[10px] md:text-[11px] tracking-[0.24em] text-white/45 text-right"
        dir="ltr"
      >
        <div>[ 100% OEM · MADE IN JAPAN ]</div>
      </div>

      {/* Bottom ticker */}
      <div
        aria-hidden
        className="absolute bottom-0 inset-x-0 z-[15] border-t border-white/10 bg-black/40 backdrop-blur-md overflow-hidden h-8"
      >
        <div
          className="flex whitespace-nowrap font-mono text-[10px] tracking-[0.35em] text-white/70 items-center h-full"
          style={{ animation: "lux-ticker 42s linear infinite" }}
        >
          {Array.from({ length: 3 }).map((_, k) => (
            <span key={k} className="flex items-center gap-8 px-8" dir="ltr">
              <span className="text-toyota-red">●</span> TOYOTA GENUINE
              <span>◆</span> DENSO
              <span className="text-toyota-red">●</span> AISIN
              <span>◆</span> MTX
              <span className="text-toyota-red">●</span> AUTHORIZED DISTRIBUTOR
              <span>◆</span> AL MASRIA GROUP · CAIRO · EST 1985
              <span className="text-toyota-red">●</span> NATIONWIDE SHIPPING
              <span>◆</span> 100% AUTHENTIC
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
