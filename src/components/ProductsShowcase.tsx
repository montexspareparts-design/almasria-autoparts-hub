import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, Award, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useRef, useEffect, useState } from "react";

// Brand logos
import brandGenuine from "@/assets/brand-genuine-parts.webp";
import brandOil from "@/assets/brand-toyota-oil.webp";
import brandMtx from "@/assets/brand-mtx.webp";
import brandDenso from "@/assets/brand-denso.webp";
import brandAisin from "@/assets/brand-aisin.webp";
import brandFbk from "@/assets/brand-fbk-logo.webp";

const brands = [
  { id: "toyota_genuine", nameAr: "قطع غيار تويوتا الأصلية", nameEn: "Toyota Genuine Parts", code: "OEM", origin: "JAPAN", since: "1937", logo: brandGenuine, href: "/products/toyota-genuine", scale: 1 },
  { id: "toyota_oils", nameAr: "زيوت تويوتا الأصلية", nameEn: "Toyota Genuine Lubricants", code: "LUBE", origin: "JAPAN", since: "1937", logo: brandOil, href: "/products/toyota-oils", scale: 1.5 },
  { id: "mtx_aftermarket", nameAr: "MTX Aftermarket", nameEn: "MTX Aftermarket", code: "MTX", origin: "GERMANY", since: "1985", logo: brandMtx, href: "/products/mtx-aftermarket", scale: 1.5 },
  { id: "denso", nameAr: "دينسو", nameEn: "DENSO", code: "DNS", origin: "JAPAN", since: "1949", logo: brandDenso, href: "/products/denso", scale: 1 },
  { id: "aisin", nameAr: "أيسن", nameEn: "AISIN", code: "ASN", origin: "JAPAN", since: "1965", logo: brandAisin, href: "/products/aisin", scale: 1 },
  { id: "fbk", nameAr: "FBK فرامل", nameEn: "FBK Brakes", code: "FBK", origin: "JAPAN", since: "1948", logo: brandFbk, href: "/products/fbk", scale: 1.2 },
];

const taglines = [
  "وكلاء معتمدون · ضمان أصلي",
  "ست علامات · مصدر واحد موثوق",
  "هندسة يابانية · جودة بلا تنازل",
];

const ProductsShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [tagIdx, setTagIdx] = useState(0);
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);

  useEffect(() => {
    const id = setInterval(() => setTagIdx((i) => (i + 1) % taglines.length), 3200);
    return () => clearInterval(id);
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        left: `${(i * 53) % 100}%`,
        delay: `${(i * 0.7) % 14}s`,
        duration: `${12 + ((i * 1.9) % 10)}s`,
        size: 2 + (i % 3),
      })),
    []
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sectionRef.current) return;
    const r = sectionRef.current.getBoundingClientRect();
    spotX.set(((e.clientX - r.left) / r.width) * 100);
    spotY.set(((e.clientY - r.top) / r.height) * 100);
  };

  const spotlightBg = useTransform(
    [spotX, spotY],
    ([x, y]) =>
      `radial-gradient(600px circle at ${x}% ${y}%, hsl(353 92% 48% / 0.22), transparent 55%)`
  );

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      id="products"
      className="relative w-full bg-carbon overflow-hidden py-24 md:py-32"
      aria-label="منتجاتنا"
    >
      {/* Animated grid */}
      <div aria-hidden className="absolute inset-0 lux-grid-bg animate-lux-grid-pan opacity-50" />

      {/* Cursor spotlight */}
      <motion.div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: spotlightBg }} />

      {/* Ambient red gradient */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 30%, hsl(353 92% 48% / 0.18) 0%, transparent 60%)",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, hsl(0 0% 0% / 0.75) 100%)",
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
              boxShadow: "0 0 10px hsl(var(--toyota-red) / 0.9)",
            }}
          />
        ))}
      </div>

      {/* Top & bottom red hairlines */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-70" />
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-70" />

      {/* Corner brackets */}
      <div aria-hidden className="pointer-events-none absolute inset-6 md:inset-10 z-20">
        <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[hsl(var(--gold)/0.7)]" />
        <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[hsl(var(--gold)/0.7)]" />
        <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[hsl(var(--gold)/0.7)]" />
        <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[hsl(var(--gold)/0.7)]" />
      </div>

      {/* Marquee backdrop */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute top-1/2 left-1/2 w-[280vw] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap animate-lux-marquee opacity-90"
      >
        <span
          dir="ltr"
          className="font-display font-black tracking-tighter text-mega-outline"
          style={{ fontSize: "clamp(70px, 13vw, 200px)", letterSpacing: "-0.04em" }}
        >
          AUTHORIZED · DISTRIBUTOR · SINCE 1996 · AUTHORIZED · DISTRIBUTOR ·
        </span>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          {/* Eyebrow row */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="hidden sm:block h-px w-12 bg-gradient-to-l from-gold/70 to-transparent" />
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-carbon/80 backdrop-blur-md border border-toyota-red/40 shadow-red-glow">
              <Award className="w-4 h-4 text-gold" />
              <span className="font-display font-black text-xs tracking-[0.3em] text-white">
                AUTHORIZED · 6 BRANDS
              </span>
              <ShieldCheck className="w-4 h-4 text-toyota-red" />
            </div>
            <span className="hidden sm:block h-px w-12 bg-gradient-to-r from-gold/70 to-transparent" />
          </div>

          {/* Headline w/ giant outline echo */}
          <div className="relative inline-block">
            <span
              aria-hidden
              dir="ltr"
              className="hidden md:block absolute -top-8 left-1/2 -translate-x-1/2 font-display font-black text-mega-outline pointer-events-none select-none"
              style={{ fontSize: "clamp(90px, 11vw, 180px)", lineHeight: 1, letterSpacing: "-0.05em", opacity: 0.18 }}
            >
              BRANDS
            </span>
            <h2
              className="relative font-tajawal font-black text-white leading-[1.05]"
              style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
            >
              ست علامات. <span className="text-toyota-red">مصدر واحد.</span>
            </h2>
          </div>

          <div className="flex items-center justify-center gap-3 my-6">
            <span className="h-px w-16 bg-gradient-to-l from-transparent via-gold/60 to-toyota-red" />
            <span className="w-2 h-2 rotate-45 bg-toyota-red shadow-red-glow" />
            <span className="h-px w-16 bg-gradient-to-r from-transparent via-gold/60 to-toyota-red" />
          </div>

          {/* Rotating tagline */}
          <div className="h-7 relative overflow-hidden">
            {taglines.map((t, i) => (
              <motion.p
                key={i}
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: tagIdx === i ? 0 : -28, opacity: tagIdx === i ? 1 : 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 font-tajawal font-medium text-soft text-base md:text-lg"
              >
                {t}
              </motion.p>
            ))}
          </div>
        </motion.div>

        {/* Brands Grid - 3x2 */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-7">
            {brands.map((brand, i) => (
              <BrandCard key={brand.id} brand={brand} index={i} />
            ))}
          </div>
        </div>

        {/* Bottom credentials strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-soft/70 font-display text-[11px] tracking-[0.3em] font-bold"
        >
          <span>EST · 1996</span>
          <span className="text-toyota-red">◆</span>
          <span>JAPAN · GERMANY</span>
          <span className="text-toyota-red">◆</span>
          <span>OEM CERTIFIED</span>
          <span className="text-toyota-red">◆</span>
          <span>EGYPT NATIONWIDE</span>
        </motion.div>
      </div>
    </section>
  );
};

const BrandCard = ({ brand, index }: { brand: typeof brands[0]; index: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 18 });
  const glareX = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(my, [-0.5, 0.5], ["0%", "100%"]);

  const handleMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const indexLabel = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: 0.08 + index * 0.07, duration: 0.6, type: "spring", stiffness: 90 }}
      style={{ perspective: 1200 }}
    >
      <Link to={brand.href} className="group block" aria-label={`تصفح منتجات ${brand.nameAr}`}>
        <motion.div
          ref={cardRef}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
          className="relative"
        >
          {/* Giant ghost index — sits outside the card */}
          <span
            aria-hidden
            dir="ltr"
            className="absolute -top-7 -right-2 font-display font-black text-transparent select-none pointer-events-none z-0"
            style={{
              fontSize: "clamp(60px, 7vw, 92px)",
              lineHeight: 1,
              WebkitTextStroke: "1px hsl(var(--gold) / 0.35)",
              letterSpacing: "-0.05em",
            }}
          >
            {indexLabel}
          </span>

          {/* Conic glow ring on hover */}
          <div
            aria-hidden
            className="absolute -inset-[2px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(var(--toyota-red)) 0%, hsl(var(--gold)) 25%, hsl(var(--toyota-red)) 50%, transparent 75%, hsl(var(--gold)) 100%)",
              filter: "blur(14px)",
            }}
          />

          {/* Card */}
          <div className="relative rounded-2xl overflow-hidden bg-carbon/85 backdrop-blur-xl border border-white/10 group-hover:border-toyota-red/60 shadow-2xl shadow-black/60 transition-colors duration-300">
            {/* Corner brackets */}
            <span aria-hidden className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-gold/70 z-20" />
            <span aria-hidden className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-gold/70 z-20" />
            <span aria-hidden className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-gold/70 z-20" />
            <span aria-hidden className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-gold/70 z-20" />

            {/* Top red hairline */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent" />

            {/* Logo container */}
            <div className="relative aspect-[4/3] flex items-center justify-center p-6 bg-white overflow-hidden">
              {/* Subtle radial texture */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-30"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, transparent 55%, hsl(0 0% 0% / 0.08) 100%)",
                }}
              />

              {/* Diagonal grid texture */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 12px)",
                }}
              />

              {/* Cursor-following glare */}
              <motion.div
                aria-hidden
                className="absolute w-40 h-40 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: glareX,
                  top: glareY,
                  x: "-50%",
                  y: "-50%",
                  background:
                    "radial-gradient(circle, hsl(353 92% 48% / 0.18), transparent 70%)",
                }}
              />

              <motion.img
                src={brand.logo}
                alt={brand.nameAr}
                loading="lazy"
                className="relative max-w-full max-h-full object-contain z-10"
                style={{ transform: `scale(${brand.scale})`, transformStyle: "preserve-3d", translateZ: 30 }}
                whileHover={{ scale: brand.scale * 1.08 }}
                transition={{ duration: 0.4 }}
              />

              {/* Authorized chip */}
              <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-carbon/95 border border-toyota-red/50 backdrop-blur-sm flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-toyota-red" />
                <span className="font-display font-black text-[10px] text-white tracking-wider">
                  #{brand.code}
                </span>
              </div>

              {/* Origin chip bottom-left */}
              <div className="absolute bottom-3 left-3 z-20 px-2 py-0.5 rounded-sm bg-black/80 border border-gold/40">
                <span className="font-display font-bold text-[9px] text-gold tracking-[0.2em]">
                  {brand.origin} · {brand.since}
                </span>
              </div>
            </div>

            {/* Text block */}
            <div className="relative px-4 py-4 bg-carbon">
              {/* Sweep shimmer on hover */}
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, hsl(var(--toyota-red) / 0.08) 50%, transparent 70%)",
                }}
              />
              <div className="text-center relative">
                <h3 className="font-tajawal font-black text-white text-sm md:text-base mb-1 group-hover:text-toyota-red transition-colors">
                  {brand.nameAr}
                </h3>
                <p className="font-display text-soft/70 text-[10px] md:text-xs font-bold tracking-[0.2em]">
                  {brand.nameEn}
                </p>
              </div>

              {/* CTA line */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-1.5 text-toyota-red opacity-85 group-hover:opacity-100 transition-opacity">
                <Sparkles className="w-3 h-3" />
                <span className="font-tajawal font-bold text-xs">تصفح المنتجات</span>
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1.5" />
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default ProductsShowcase;
