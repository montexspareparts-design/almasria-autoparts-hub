import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * HeroSection — "Engineering Blueprint" concept.
 *
 * A living Toyota OEM technical schematic. On the left, a hand-drawn SVG
 * brake-disc + caliper assembly draws itself in, orbited by a rotating radar
 * sweep and pulsing red hotspots that point to real Toyota part numbers with
 * Arabic callouts. The right side carries a bold Arabic headline over a
 * blueprint grid. No generic gradients, no stock photos, no metaballs — pure
 * catalog-engineer aesthetic that only makes sense for a genuine-parts brand.
 */

const CALLOUTS = [
  { top: "12%", right: "6%",  code: "90915-YZZD4", label: "فلتر زيت أصلي",   side: "r" },
  { top: "34%", right: "2%",  code: "43512-0K180", label: "طبلة فرامل أمامي", side: "r" },
  { top: "60%", right: "8%",  code: "90919-01247", label: "بوجيه دنسو",       side: "r" },
  { top: "82%", right: "14%", code: "16100-49847", label: "طلمبة مياه أيسِن",  side: "r" },
];

const HeroSection = () => {
  return (
    <section
      id="hero"
      dir="rtl"
      className="relative w-full min-h-[100vh] overflow-hidden isolate bg-[#07080a] text-white"
      aria-label="قطع غيار تويوتا الأصلية — مخطط هندسي حي"
    >
      {/* Blueprint grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* Sub-grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      {/* Red ambient wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(700px 500px at 25% 45%, hsl(var(--toyota-red) / 0.20), transparent 65%), radial-gradient(600px 400px at 90% 90%, hsl(var(--toyota-red) / 0.10), transparent 60%)",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.65) 100%)" }}
      />

      {/* Top rail — technical metadata */}
      <div className="absolute top-24 left-0 right-0 z-20 px-6 md:px-10 lg:px-14 flex items-center justify-between font-mono text-[10px] md:text-[11px] tracking-[0.3em] text-white/45" dir="ltr">
        <div className="flex items-center gap-6">
          <span className="text-toyota-red">◆</span>
          <span>DOC · TMC-EG / REV.2026</span>
          <span className="hidden md:inline text-white/25">/</span>
          <span className="hidden md:inline">SHEET 01 OF 04</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden md:inline">SCALE 1:1</span>
          <span className="hidden md:inline text-white/25">/</span>
          <span>AL MASRIA · AUTHORIZED</span>
          <span className="w-2 h-2 rounded-full bg-toyota-red animate-pulse" />
        </div>
      </div>

      <div className="relative z-10 max-w-[1500px] mx-auto px-6 md:px-10 lg:px-14 pt-40 md:pt-44 pb-40 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* TEXT SIDE (right in RTL, first column visually right) */}
        <div className="lg:col-span-6 order-2 lg:order-2">
          <div className="inline-flex items-center gap-3 rounded-none border border-white/15 bg-white/[0.02] px-3 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 bg-toyota-red" />
            <span className="font-mono text-[10.5px] tracking-[0.28em] text-white/70" dir="ltr">
              TOYOTA · GENUINE PARTS · EGYPT
            </span>
          </div>

          <h1
            className="font-almarai font-black leading-[0.95] tracking-[-0.02em]"
            style={{ fontSize: "clamp(44px, 6.4vw, 96px)" }}
          >
            هندسة يابانية.
            <br />
            <span className="relative inline-block">
              <span className="text-toyota-red">قطعة</span>{" "}
              <span className="text-white/95">أصلية</span>
              <svg
                aria-hidden
                className="absolute -bottom-3 right-0 left-0 w-full h-3"
                viewBox="0 0 400 12" preserveAspectRatio="none"
              >
                <path
                  d="M2 8 L 200 8 L 210 3 L 220 8 L 398 8"
                  stroke="hsl(var(--toyota-red))"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="600"
                  strokeDashoffset="600"
                  style={{ animation: "lux-draw 2s ease-out 0.6s forwards" }}
                />
              </svg>
            </span>
            <br />
            <span className="font-almarai text-white/70" style={{ fontSize: "0.72em" }}>
              كل رقم بارت له قصة.
            </span>
          </h1>

          <p className="mt-8 max-w-lg font-plex-ar text-[15px] md:text-[16.5px] leading-[2] text-white/65">
            نحن لا نبيع «قطع غيار» — نحن نُسلّم رقم البارت الصحيح لمحرّكك،
            مختومًا من تويوتا موتور اليابان، ومدعومًا بضمان الوكيل، ومسنودًا
            بأربعين عامًا من العمل الهادئ في السوق المصري.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/products"
              className="group inline-flex items-center gap-3 bg-toyota-red hover:bg-[hsl(var(--toyota-red-glow))] px-8 py-4 font-plex-ar font-semibold text-white text-[15px] transition-all"
              style={{
                clipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
                boxShadow: "0 20px 50px -15px hsl(var(--toyota-red) / 0.7)",
              }}
            >
              افتح الكتالوج
              <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1.5" />
            </Link>
            <Link
              to="/dealer-login"
              className="group inline-flex items-center gap-3 border border-white/20 hover:border-white/50 px-8 py-4 font-plex-ar font-medium text-white/85 hover:text-white text-[15px] transition-all"
            >
              أنا تاجر جملة
            </Link>
          </div>

          {/* Meta strip */}
          <div className="mt-10 grid grid-cols-3 max-w-md gap-6 font-mono text-white/55" dir="ltr">
            <div className="border-r border-white/10 pr-4">
              <div className="text-white font-almarai font-black text-2xl">1985</div>
              <div className="text-[10px] tracking-[0.2em] mt-1">EST · CAIRO</div>
            </div>
            <div className="border-r border-white/10 pr-4">
              <div className="text-white font-almarai font-black text-2xl">12K+</div>
              <div className="text-[10px] tracking-[0.2em] mt-1">PART NUMBERS</div>
            </div>
            <div>
              <div className="text-toyota-red font-almarai font-black text-2xl">100%</div>
              <div className="text-[10px] tracking-[0.2em] mt-1">GENUINE OEM</div>
            </div>
          </div>
        </div>

        {/* BLUEPRINT DIAGRAM SIDE */}
        <div className="lg:col-span-6 order-1 lg:order-1 relative">
          <div className="relative w-full aspect-square max-w-[620px] mx-auto">
            {/* Rotating scan ring */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ animation: "lux-spin-slow 24s linear infinite" }}
            >
              <svg viewBox="0 0 600 600" className="w-full h-full">
                <defs>
                  <linearGradient id="scan" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--toyota-red))" stopOpacity="0" />
                    <stop offset="100%" stopColor="hsl(var(--toyota-red))" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
                <circle cx="300" cy="300" r="285" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 8" />
                <path d="M 300 15 A 285 285 0 0 1 585 300" fill="none" stroke="url(#scan)" strokeWidth="2" />
              </svg>
            </div>

            {/* Static schematic */}
            <svg viewBox="0 0 600 600" className="absolute inset-0 w-full h-full">
              <defs>
                <radialGradient id="discGrad" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0%" stopColor="#1a1a20" />
                  <stop offset="70%" stopColor="#0a0a0c" />
                  <stop offset="100%" stopColor="#050506" />
                </radialGradient>
                <linearGradient id="caliperGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--toyota-red))" />
                  <stop offset="100%" stopColor="hsl(0 70% 30%)" />
                </linearGradient>
              </defs>

              {/* Outer ticks */}
              <g stroke="rgba(255,255,255,0.25)" strokeWidth="1">
                {Array.from({ length: 60 }).map((_, i) => {
                  const a = (i / 60) * Math.PI * 2;
                  const r1 = 262, r2 = i % 5 === 0 ? 250 : 256;
                  const x1 = 300 + Math.cos(a) * r1;
                  const y1 = 300 + Math.sin(a) * r1;
                  const x2 = 300 + Math.cos(a) * r2;
                  const y2 = 300 + Math.sin(a) * r2;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} opacity={i % 5 === 0 ? 0.55 : 0.2} />;
                })}
              </g>

              {/* Concentric rings */}
              <circle cx="300" cy="300" r="240" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 6" />
              <circle cx="300" cy="300" r="200" fill="url(#discGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"
                style={{ animation: "lux-draw 2.4s ease-out both", strokeDasharray: 1300, strokeDashoffset: 0 }} />
              <circle cx="300" cy="300" r="170" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
              <circle cx="300" cy="300" r="150" fill="none" stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />

              {/* Drilled cooling holes on the disc */}
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i / 24) * Math.PI * 2;
                const r = 185;
                const x = 300 + Math.cos(a) * r;
                const y = 300 + Math.sin(a) * r;
                return <circle key={i} cx={x} cy={y} r="4" fill="#050506" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />;
              })}

              {/* Lug nuts */}
              {Array.from({ length: 5 }).map((_, i) => {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const r = 90;
                const x = 300 + Math.cos(a) * r;
                const y = 300 + Math.sin(a) * r;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="10" fill="#111" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                    <circle cx={x} cy={y} r="4" fill="rgba(255,255,255,0.15)" />
                  </g>
                );
              })}

              {/* Hub */}
              <circle cx="300" cy="300" r="40" fill="#0a0a0c" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
              <circle cx="300" cy="300" r="24" fill="#000" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              <text x="300" y="304" textAnchor="middle" fill="hsl(var(--toyota-red))" fontFamily="monospace" fontSize="10" letterSpacing="2">TMC</text>

              {/* Brake caliper arc (top-right) */}
              <path
                d="M 300 88 A 212 212 0 0 1 512 300 L 490 300 A 190 190 0 0 0 300 110 Z"
                fill="url(#caliperGrad)"
                opacity="0.92"
                style={{ animation: "lux-draw 2.6s ease-out 0.4s both" }}
              />
              <text
                x="405" y="150"
                fill="white" fontFamily="monospace" fontSize="9" letterSpacing="3"
                transform="rotate(45 405 150)"
              >TOYOTA</text>

              {/* Center dimension line */}
              <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" fontFamily="monospace" fontSize="9" fill="rgba(255,255,255,0.6)">
                <line x1="100" y1="500" x2="500" y2="500" strokeDasharray="3 3" />
                <line x1="100" y1="495" x2="100" y2="505" />
                <line x1="500" y1="495" x2="500" y2="505" />
                <text x="300" y="516" textAnchor="middle">Ø 296 mm</text>
              </g>

              {/* Pulsing hotspots */}
              {[
                { x: 300, y: 100 },
                { x: 500, y: 300 },
                { x: 300, y: 500 },
                { x: 100, y: 300 },
              ].map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill="hsl(var(--toyota-red))" />
                  <circle cx={p.x} cy={p.y} r="10" fill="none" stroke="hsl(var(--toyota-red))" strokeWidth="1.2"
                    style={{ animation: `lux-pulse-ring 2.4s ease-out ${i * 0.4}s infinite`, transformOrigin: `${p.x}px ${p.y}px` }} />
                </g>
              ))}
            </svg>

            {/* Radial callouts overlay (HTML for crisp Arabic type) */}
            {CALLOUTS.map((c, i) => (
              <div
                key={c.code}
                className="absolute z-10 opacity-0"
                style={{
                  top: c.top,
                  right: c.right,
                  animation: `lux-fade-up 0.7s ease-out ${1.2 + i * 0.25}s forwards`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-px w-10 bg-toyota-red/60" />
                  <div className="border-r border-toyota-red/70 pr-3">
                    <div className="font-mono text-[10px] tracking-[0.2em] text-toyota-red" dir="ltr">
                      {c.code}
                    </div>
                    <div className="font-plex-ar text-[12px] text-white/85 mt-0.5">
                      {c.label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom rail */}
      <div className="absolute bottom-0 inset-x-0 z-20 border-t border-white/10 bg-black/50 backdrop-blur">
        <div className="max-w-[1500px] mx-auto px-6 md:px-10 lg:px-14 py-4 flex items-center justify-between font-mono text-[10.5px] tracking-[0.28em] text-white/60" dir="ltr">
          <div className="flex items-center gap-6">
            <span className="text-toyota-red">●</span>
            <span>TOYOTA</span>
            <span className="text-white/20">/</span>
            <span>DENSO</span>
            <span className="text-white/20">/</span>
            <span>AISIN</span>
            <span className="text-white/20">/</span>
            <span>MTX</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-white/45">
            <span>SCROLL</span>
            <span className="w-6 h-px bg-white/40" />
            <span>↓</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
