import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Truck, BadgeCheck, Wrench } from "lucide-react";
import heroImage from "@/assets/hero-toyota-parts.jpg";

/**
 * HeroSection — Al Masria · Toyota Genuine Parts.
 *
 * Editorial split composition:
 *   - Right column (RTL primary): Arabic-first headline, subline, CTAs, trust chips
 *   - Left column: cinematic product photograph with vignette + red rim glow
 *   - Bottom strip: authorized-brand rail (Toyota / DENSO / AISIN / MTX)
 *
 * No shaders, no marquee, no gimmicks. Just relevance, breathing room, and craft.
 */

const trustChips = [
  { icon: BadgeCheck, label: "موزّع معتمد" },
  { icon: ShieldCheck, label: "ضمان الوكيل" },
  { icon: Truck, label: "شحن لكل مصر" },
  { icon: Wrench, label: "خبرة منذ 1985" },
];

const HeroSection = () => {
  return (
    <section
      id="hero"
      dir="rtl"
      className="relative w-full min-h-[92vh] overflow-hidden isolate bg-[#0a0a0c] text-white"
      aria-label="قطع غيار تويوتا الأصلية — المصرية"
    >
      {/* Ambient background wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1200px 700px at 85% 20%, hsl(0 78% 42% / 0.18), transparent 60%), radial-gradient(900px 600px at 10% 90%, hsl(45 60% 45% / 0.08), transparent 60%)",
        }}
      />
      {/* Fine dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 lg:px-14 pt-28 md:pt-32 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* TEXT SIDE — right in RTL */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.03] backdrop-blur px-4 py-1.5 mb-7">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-toyota-red animate-ping opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-toyota-red" />
              </span>
              <span className="font-plex-ar text-[12px] tracking-wide text-white/75">
                موزّع تويوتا المعتمد في مصر · منذ 1985
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-almarai font-black text-white leading-[1.05]"
              style={{ fontSize: "clamp(38px, 5.6vw, 78px)" }}
            >
              قطع غيار تويوتا
              <br />
              <span className="text-toyota-red">الأصلية</span>{" "}
              <span className="text-white/85">بضمان الوكيل</span>
            </h1>

            {/* Sub */}
            <p className="mt-7 max-w-xl font-plex-ar text-[15px] md:text-[17px] leading-[1.9] text-white/70">
              كل قطعة مختومة من المصنع — تويوتا، دنسو، أيسِن، ومونتكس.
              أسعار الوكيل، شحن معتمد لجميع محافظات مصر، وخبرة أربعين عامًا
              في خدمة أسطول تويوتا المصري.
            </p>

            {/* Trust chips */}
            <div className="mt-8 flex flex-wrap gap-2.5">
              {trustChips.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5"
                >
                  <Icon className="w-3.5 h-3.5 text-toyota-red" strokeWidth={2.4} />
                  <span className="font-plex-ar text-[12.5px] text-white/80">{label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/products"
                className="group inline-flex items-center gap-3 rounded-full bg-toyota-red hover:bg-toyota-red/90 px-7 py-3.5 font-plex-ar font-semibold text-white text-[15px] transition-all shadow-[0_10px_30px_-10px_hsl(0_82%_45%/0.6)] hover:shadow-[0_14px_40px_-10px_hsl(0_82%_45%/0.75)]"
              >
                تصفّح قطع الغيار
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
              </Link>
              <Link
                to="/dealer-login"
                className="group inline-flex items-center gap-3 rounded-full border border-white/15 hover:border-white/40 bg-white/[0.03] hover:bg-white/[0.06] px-7 py-3.5 font-plex-ar font-medium text-white/85 hover:text-white text-[15px] transition-all"
              >
                دخول تجّار الجملة
              </Link>
            </div>

            {/* Fine print */}
            <div className="mt-8 flex items-center gap-6 font-plex-ar text-[12.5px] text-white/45">
              <span>‎+٤٠ عامًا من الخبرة</span>
              <span className="h-3 w-px bg-white/15" />
              <span>‎+١٢٬٠٠٠ قطعة أصلية</span>
              <span className="h-3 w-px bg-white/15" />
              <span>‎+٥٠٠ تاجر معتمد</span>
            </div>
          </div>

          {/* IMAGE SIDE */}
          <div className="lg:col-span-6 order-1 lg:order-2 relative">
            <div className="relative aspect-[4/3] w-full rounded-[28px] overflow-hidden border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
              <img
                src={heroImage}
                alt="قطع غيار تويوتا الأصلية — فلتر زيت وطبلة فرامل وبوجيه دنسو وطلمبة مياه أيسِن"
                width={1920}
                height={1280}
                className="w-full h-full object-cover"
                style={{ animation: "lux-kenburns 22s ease-in-out infinite alternate" }}
              />
              {/* Corner tag */}
              <div className="absolute top-4 left-4 rounded-full bg-black/60 backdrop-blur border border-white/15 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-white/85" dir="ltr">
                <span className="text-toyota-red">●</span> TOYOTA GENUINE
              </div>
              {/* Bottom vignette so the image grounds into the page */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 55%, rgba(10,10,12,0.55) 100%)",
                }}
              />
            </div>

            {/* Floating stat card */}
            <div className="hidden md:flex absolute -bottom-6 -right-6 items-center gap-4 rounded-2xl bg-[#111114]/90 backdrop-blur border border-white/10 px-5 py-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)]">
              <div className="flex flex-col">
                <span className="font-almarai font-black text-2xl text-white leading-none">
                  ١٠٠٪
                </span>
                <span className="font-plex-ar text-[11px] text-white/60 mt-1">
                  أصلية ومختومة
                </span>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="font-almarai font-black text-2xl text-toyota-red leading-none">
                  ٤٠+
                </span>
                <span className="font-plex-ar text-[11px] text-white/60 mt-1">
                  عامًا من الثقة
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom brand rail */}
      <div className="relative z-10 border-t border-white/8 bg-black/40 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-14 py-5 flex flex-wrap items-center justify-between gap-6">
          <span className="font-plex-ar text-[12px] text-white/45">
            علامات معتمدة لدينا
          </span>
          <div className="flex items-center gap-8 md:gap-12 font-mono text-[13px] tracking-[0.28em] text-white/75" dir="ltr">
            <span>TOYOTA</span>
            <span className="text-white/20">/</span>
            <span>DENSO</span>
            <span className="text-white/20">/</span>
            <span>AISIN</span>
            <span className="text-white/20">/</span>
            <span>MTX</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
