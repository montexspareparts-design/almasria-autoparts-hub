import { Link } from "react-router-dom";
import { ChevronLeft, ShieldCheck, Truck, Headphones } from "lucide-react";
import { haptic } from "@/lib/haptics";
import bannerGenuine from "@/assets/native/banner-genuine.jpg";
import bannerOils from "@/assets/native/banner-oils.jpg";
import bannerMtx from "@/assets/native/banner-mtx.jpg";

/**
 * Marketing hero + stats + editorial banners.
 * Moved off the native home screen (which is now fitment-first)
 * and rendered here on /about inside the app shell.
 */

const STATS = [
  { value: "25+", label: "سنة خبرة" },
  { value: "12K+", label: "صنف متاح" },
  { value: "48h", label: "زمن التوصيل" },
];

const EDITORIAL = [
  {
    kicker: "ORIGINAL",
    title: "قطع غيار تويوتا الأصلية",
    sub: "من المصدر مباشرة",
    to: "/products/genuine-toyota-parts",
    img: bannerGenuine,
  },
  {
    kicker: "LUBRICANTS",
    title: "زيوت تويوتا الأصلية",
    sub: "كل درجات اللزوجة بأسعار الجملة",
    to: "/products?category=oils-gasoline",
    img: bannerOils,
  },
  {
    kicker: "OUR BRAND",
    title: "MTX — البديل الاقتصادي",
    sub: "جودة معتمدة وسعر مناسب",
    to: "/mtx",
    img: bannerMtx,
  },
];

const NativeAboutHighlights = () => (
  <div dir="rtl" className="pd-root text-white pt-2 pb-6">
    <section className="px-4 pt-4">
      <p className="pd-mono text-[10.5px] text-gold tracking-[0.09em]">
        AUTHORIZED DISTRIBUTOR · SINCE 1999
      </p>
      <h1 className="text-[26px] font-semibold leading-[1.4] mt-2">
        قطع غيار تويوتا <span className="text-gold">الأصلية</span>
      </h1>
      <p className="text-[13.5px] text-white/55 mt-2 leading-relaxed">
        كتالوج كامل وتوصيل خلال 48 ساعة لكل المحافظات.
      </p>
    </section>

    <section className="px-4 mt-5">
      <div className="pd-card flex items-stretch py-3">
        {STATS.map((s, i) => (
          <div key={s.label} className={`flex-1 text-center ${i > 0 ? "border-e border-white/[0.08]" : ""}`}>
            <p className="pd-mono text-[19px] font-semibold leading-none text-white">{s.value}</p>
            <p className="text-[11px] text-white/45 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="px-4 mt-3">
      <div className="pd-card flex items-center justify-between px-3 py-3">
        {[
          { icon: ShieldCheck, label: "ضمان أصالة" },
          { icon: Truck, label: "توصيل 48 ساعة" },
          { icon: Headphones, label: "دعم فني" },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-1.5">
            <t.icon className="w-4 h-4 text-gold shrink-0" />
            <span className="text-[11px] text-white/60">{t.label}</span>
          </div>
        ))}
      </div>
    </section>

    <section className="mt-6">
      <h2 className="px-4 text-[16px] font-semibold">مختارات المصرية</h2>
      <div className="flex gap-3 overflow-x-auto pd-rail px-4 mt-3 pb-1">
        {EDITORIAL.map((b) => (
          <Link
            key={b.to}
            to={b.to}
            onClick={() => void haptic("light")}
            className="pd-snap shrink-0 w-[78%] rounded-[16px] overflow-hidden relative pd-hair ios-press"
          >
            <img src={b.img} alt={b.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
            <div className="relative p-4 min-h-[190px] flex flex-col justify-end">
              <p className="pd-mono text-[10px] text-gold tracking-[0.09em]">{b.kicker}</p>
              <h3 className="text-[17px] font-semibold leading-[1.4] mt-1.5">{b.title}</h3>
              <p className="text-[12px] text-white/55 mt-1">{b.sub}</p>
              <span className="self-start inline-flex items-center gap-1 mt-3 text-[12.5px] font-medium text-white">
                اعرف أكتر
                <ChevronLeft className="w-4 h-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  </div>
);

export default NativeAboutHighlights;
