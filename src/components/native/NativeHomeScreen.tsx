import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Truck,
  Headphones,
  ChevronLeft,
  ScanLine,
  Car,
  Wrench,
  BookOpen,
  PackageSearch,
  Store,
  Building2,
  BadgeCheck,
  Phone,
  MapPin,
  ScrollText,
  Sparkles,
  MessageCircle,
  Info,
  Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { LazyImage } from "@/components/ui/lazy-image";
import { haptic } from "@/lib/haptics";
import { easeOutIOS, revealUp } from "@/lib/motion";
import logoDark from "@/assets/almasria-logo-dark.png";

import NativeHero3D from "@/components/native/NativeHero3D";
import bannerGenuine from "@/assets/native/banner-genuine.jpg";
import bannerOils from "@/assets/native/banner-oils.jpg";
import bannerMtx from "@/assets/native/banner-mtx.jpg";
import catFilters from "@/assets/native/cat-filters.jpg";
import catOils from "@/assets/native/cat-oils.jpg";
import catBrakes from "@/assets/native/cat-brakes.jpg";
import catElectrical from "@/assets/native/cat-electrical.jpg";
import catBelts from "@/assets/native/cat-belts.jpg";
import catCooling from "@/assets/native/cat-cooling.jpg";

import brandGenuine from "@/assets/brand-genuine-parts.webp";
import brandOil from "@/assets/brand-toyota-oil.webp";
import brandMtxLogo from "@/assets/brand-mtx.webp";
import brandDenso from "@/assets/brand-denso.webp";
import brandAisin from "@/assets/brand-aisin.webp";
import brandFbk from "@/assets/brand-fbk-logo.webp";

/* ────────────────────────────────────────────────────────────
   Native app home — Apple HIG 2026.
   Restrained editorial luxury: one accent, generous margins,
   concentric radii, glass reserved for chrome only.
   Rendered exclusively inside the iOS/Android shell.
   ──────────────────────────────────────────────────────────── */

const GUTTER = "px-5";

const CATEGORIES = [
  { slug: "filters", label: "فلاتر", sub: "زيت • هواء • مكيف", img: catFilters },
  { slug: "oils-gasoline", label: "زيوت", sub: "محرك • فتيس", img: catOils },
  { slug: "brakes", label: "فرامل", sub: "تيل • هوبات", img: catBrakes },
  { slug: "electrical", label: "كهرباء", sub: "بوجيهات • دينمو", img: catElectrical },
  { slug: "belts-bearings", label: "سيور", sub: "كاويتش • رمان", img: catBelts },
  { slug: "water-cooling", label: "تبريد", sub: "رادياتير • طلمبة", img: catCooling },
];

const EDITORIAL = [
  {
    kicker: "ORIGINAL",
    title: "قطع غيار تويوتا الأصلية",
    sub: "ضمان وكالة ١٠٠٪ — من المصدر مباشرة",
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

const SERVICES = [
  { label: "قطع تويوتا الأصلية", hint: "موزّع معتمد", to: "/products/genuine-toyota-parts", icon: BadgeCheck },
  { label: "علامة MTX", hint: "بديل اقتصادي معتمد", to: "/mtx", icon: Sparkles },
  { label: "التصفّح حسب الموديل", hint: "هايس • هايلوكس • كورولا", to: "/parts-by-model", icon: Car },
  { label: "التصفّح حسب النوع", hint: "فلاتر • فرامل • كهرباء", to: "/parts-by-type", icon: Wrench },
  { label: "الكتالوجات", hint: "ملفات PDF للتحميل", to: "/catalogs", icon: BookOpen },
  { label: "تتبّع الطلب", hint: "من الشحن حتى الاستلام", to: "/track-order", icon: PackageSearch },
];

const DEALER_LINKS = [
  { label: "دخول التجّار", hint: "بوابة الجملة B2B", to: "/dealer-login", icon: Store },
  { label: "تسجيل تاجر جديد", hint: "افتح حساب جملة", to: "/dealer-apply", icon: Building2 },
];

const BRANDS = [
  { label: "تويوتا الأصلية", img: brandGenuine, to: "/products/toyota-genuine" },
  { label: "زيوت تويوتا", img: brandOil, to: "/products/toyota-oils" },
  { label: "MTX", img: brandMtxLogo, to: "/products/mtx-aftermarket" },
  { label: "DENSO", img: brandDenso, to: "/products/denso" },
  { label: "AISIN", img: brandAisin, to: "/products/aisin" },
  { label: "FBK", img: brandFbk, to: "/products/fbk-brakes" },
];

const MODELS = [
  { label: "هايس", slug: "hiace" },
  { label: "كوستر", slug: "coaster" },
  { label: "هايلوكس", slug: "hilux" },
  { label: "لاند كروزر", slug: "land-cruiser" },
  { label: "ياريس", slug: "yaris" },
  { label: "كورولا", slug: "corolla" },
];

const GUIDES = [
  { label: "إزاي تعرف القطعة الأصلية؟", to: "/guides/identifying-genuine-toyota-parts" },
  { label: "أصلي vs MTX vs DENSO", to: "/guides/genuine-vs-mtx-vs-denso" },
  { label: "إمتى تغيّر فلتر الزيت؟", to: "/guides/when-to-change-oil-filter" },
  { label: "إمتى تغيّر تيل الفرامل؟", to: "/guides/when-to-change-brake-pads" },
  { label: "صيانة كورولا", to: "/guides/toyota-corolla-maintenance" },
  { label: "صيانة هايلوكس", to: "/guides/toyota-hilux-maintenance" },
];

const ABOUT_LINKS = [
  { label: "عن الشركة", hint: "قصة المصرية جروب", to: "/about", icon: Info },
  { label: "ليه المصرية؟", hint: "اللي بيميّزنا", to: "/what-sets-us-apart", icon: BadgeCheck },
  { label: "فروعنا وبيانات التواصل", hint: "القاهرة والمحافظات", to: "/contact", icon: MapPin },
  { label: "السياسات", hint: "الشحن • الاسترجاع • الخصوصية", to: "/policies", icon: ScrollText },
];

const STATS = [
  { value: "25+", label: "سنة خبرة" },
  { value: "12K+", label: "صنف متاح" },
  { value: "48h", label: "زمن التوصيل" },
];

const NativeHomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const { scrollY } = useScroll();
  const heroShift = useTransform(scrollY, [0, 420], [0, 90]);
  const heroFade = useTransform(scrollY, [0, 300], [1, 0.35]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["native_home_products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, erp_item_code, part_number, image_url, base_price, brand")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .not("image_url", "ilike", "%/brands/%")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void haptic("light");
    if (!query.trim()) return navigate("/products");
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div dir="rtl" className="relative min-h-screen bg-carbon text-white overflow-x-hidden ar-body">
      {/* ── Website-matched ambient theme (spotlight + gold/red glow) ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-spotlight opacity-[0.55]" />
        <div className="absolute top-[38%] -right-[25%] w-[80vw] h-[80vw] rounded-full blur-[120px] bg-gold/[0.07]" />
        <div className="absolute bottom-[6%] -left-[30%] w-[85vw] h-[85vw] rounded-full blur-[130px] bg-toyota-red/[0.08]" />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(80% 60% at 50% 30%, black, transparent)",
            WebkitMaskImage: "radial-gradient(80% 60% at 50% 30%, black, transparent)",
          }}
        />
      </div>
      <div className="relative z-[1]">
      {/* ───────────── Floating glass nav bar ───────────── */}

      <motion.header
        animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : -12 }}
        transition={{ duration: 0.28, ease: easeOutIOS }}
        className={`fixed top-0 inset-x-0 z-40 ${scrolled ? "" : "pointer-events-none"}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="ios-glass border-x-0 border-t-0 rounded-none">
          <div className={`h-12 flex items-center justify-between ${GUTTER}`}>
            <img src={logoDark} alt="المصرية جروب" className="h-7 w-auto object-contain" />
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="w-9 h-9 rounded-full bg-white/[0.08] grid place-items-center ios-press"
            >
              <Bell className="w-[17px] h-[17px] text-white/75" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ───────────── Cinematic hero ───────────── */}
      <section ref={heroRef} className="relative">
        <motion.div style={{ y: heroShift, opacity: heroFade }} className="absolute inset-0 will-change-transform">
          <NativeHero3D />
        </motion.div>


        <div
          className={`relative ${GUTTER} pb-10`}
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 18px)" }}
        >
          <div className="flex items-center justify-between">
            <img src={logoDark} alt="المصرية جروب" className="h-9 w-auto object-contain" />
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="w-10 h-10 rounded-full ios-glass grid place-items-center ios-press"
            >
              <Bell className="w-[18px] h-[18px] text-white/80" />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOutIOS }}
            className="mt-16"
          >
            <p className="eyebrow text-gold">AUTHORIZED DISTRIBUTOR · SINCE 1999</p>
            <h1 className="ar-display font-black text-[34px] leading-[1.32] mt-3">
              قطع غيار تويوتا
              <br />
              الأصلية
            </h1>
            <p className="ar-body text-[15px] text-white/60 mt-3 max-w-[19rem]">
              كتالوج كامل بضمان الوكالة، وتوصيل خلال ٤٨ ساعة لكل المحافظات.
            </p>

            <div className="flex items-center gap-2.5 mt-6">
              <Link
                to="/products"
                onClick={() => void haptic("light")}
                className="inline-flex items-center gap-1.5 h-12 px-7 rounded-full bg-toyota-red text-white ar-display font-bold text-[15px] ios-press shadow-[0_16px_34px_-14px_hsl(var(--toyota-red))]"
              >
                تصفّح الكتالوج
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                onClick={() => void haptic("light")}
                className="inline-flex items-center h-12 px-6 rounded-full border border-gold/45 text-gold ar-display font-bold text-[14px] ios-press"
              >
                تواصل معنا
              </Link>
            </div>

          </motion.div>
        </div>
      </section>

      {/* ───────────── Search (understated, floats over the hero seam) ───────────── */}
      <div className={`${GUTTER} -mt-5 relative z-10`}>
        <form onSubmit={submitSearch} className="flex items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2.5 h-[52px] px-4 rounded-2xl ios-glass focus-within:border-white/25 transition-colors">
            <Search className="w-[18px] h-[18px] text-white/45 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بكود الصنف أو البارت نمبر"
              className="flex-1 min-w-0 bg-transparent outline-none ar-body text-[15px] text-white placeholder:text-white/40"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              aria-label="بحث في الكتالوج"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              void haptic("medium");
              navigate("/products");
            }}
            aria-label="مسح ضوئي للبارت نمبر"
            className="w-[52px] h-[52px] rounded-2xl bg-toyota-red grid place-items-center ios-press shadow-[0_10px_28px_-10px_hsl(var(--toyota-red)/0.9)]"
          >
            <ScanLine className="w-5 h-5 text-white" />
          </button>
        </form>
      </div>

      {/* ───────────── Stats — hairline row, not boxes ───────────── */}
      <div className={`${GUTTER} mt-7`}>
        <div className="flex items-stretch">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`flex-1 text-center ${i > 0 ? "border-e border-white/[0.09]" : ""}`}
            >
              <p className="ar-display font-black text-[22px] leading-none text-white numeric">{s.value}</p>
              <p className="ar-body text-[11.5px] text-white/45 mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────── Trust ───────────── */}
      <div className={`${GUTTER} mt-7`}>
        <div className="flex items-center justify-between rounded-2xl ios-card px-4 py-3.5">
          {[
            { icon: ShieldCheck, label: "ضمان أصالة" },
            { icon: Truck, label: "توصيل ٤٨ ساعة" },
            { icon: Headphones, label: "دعم فني" },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-2">
              <t.icon className="w-[17px] h-[17px] text-gold shrink-0" />
              <span className="ar-body text-[11.5px] text-white/65">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────── Models — chip rail ───────────── */}
      <motion.section {...revealUp} className="mt-10">
        <SectionHeader title="اختر موديل عربيتك" to="/parts-by-model" />
        <div className={`flex gap-2.5 overflow-x-auto ios-rail ${GUTTER} mt-4 pb-1`}>
          {MODELS.map((m) => (
            <Link
              key={m.slug}
              to={`/parts-by-model/${m.slug}`}
              onClick={() => void haptic("light")}
              className="shrink-0 inline-flex items-center gap-2 px-4 h-11 rounded-full ios-card ar-body text-[13.5px] font-semibold ios-press"
            >
              <Car className="w-[17px] h-[17px] text-white/40" />
              {m.label}
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ───────────── Editorial features ───────────── */}
      <motion.section {...revealUp} className="mt-10">
        <SectionHeader title="مختارات المصرية" to="/products" />
        <div className={`flex gap-4 overflow-x-auto ios-rail ${GUTTER} mt-4 pb-1 snap-x snap-mandatory`}>
          {EDITORIAL.map((b) => (
            <Link
              key={b.to}
              to={b.to}
              onClick={() => void haptic("light")}
              className="snap-center shrink-0 w-[82%] rounded-[28px] overflow-hidden relative ios-press border border-white/[0.08]"
            >
              <img
                src={b.img}
                alt={b.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/55 to-carbon/10" />
              <div className="relative p-6 min-h-[240px] flex flex-col justify-end">
                <p className="eyebrow text-gold">{b.kicker}</p>
                <h3 className="ar-display font-bold text-[21px] leading-[1.4] mt-2">{b.title}</h3>
                <p className="ar-body text-[13px] text-white/60 mt-1.5 max-w-[88%]">{b.sub}</p>
                <span className="self-start inline-flex items-center gap-1 mt-5 ar-body text-[13px] font-bold text-white">
                  اعرف أكتر
                  <ChevronLeft className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ───────────── Categories — 2-col editorial tiles ───────────── */}
      <motion.section {...revealUp} className="mt-10">
        <SectionHeader title="تسوّق حسب الفئة" to="/products" />
        <div className={`grid grid-cols-2 gap-3.5 ${GUTTER} mt-4`}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/products?category=${c.slug}`}
              onClick={() => void haptic("light")}
              className="relative rounded-[22px] overflow-hidden border border-white/[0.07] ios-press"
            >
              <div className="aspect-[4/5]">
                <img src={c.img} alt={c.label} loading="lazy" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 inset-x-0 p-3.5">
                <p className="ar-display font-bold text-[15px] leading-none">{c.label}</p>
                <p className="ar-body text-[10.5px] text-white/50 mt-1.5">{c.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ───────────── Brands ───────────── */}
      <motion.section {...revealUp} className="mt-10">
        <SectionHeader title="ماركاتنا" to="/products" />
        <div className={`flex gap-3 overflow-x-auto ios-rail ${GUTTER} mt-4 pb-1`}>
          {BRANDS.map((b) => (
            <Link
              key={b.to}
              to={b.to}
              onClick={() => void haptic("light")}
              className="shrink-0 w-[104px] rounded-2xl bg-white p-3 ios-press"
            >
              <div className="h-11 grid place-items-center">
                <img src={b.img} alt={b.label} loading="lazy" className="max-h-10 w-auto object-contain" />
              </div>
              <p className="ar-body text-[10.5px] font-bold text-carbon text-center mt-2 leading-tight">
                {b.label}
              </p>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ───────────── New arrivals ───────────── */}
      <motion.section {...revealUp} className="mt-10">
        <SectionHeader title="وصل حديثاً" to="/products" />
        <div className={`flex gap-3.5 overflow-x-auto ios-rail ${GUTTER} mt-4 pb-1 snap-x`}>
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[47%] h-64 rounded-[22px] ios-card animate-pulse" />
            ))}

          {!isLoading &&
            products.map((p: any) => (
              <Link
                key={p.id}
                to={`/products?search=${encodeURIComponent(p.sku || p.name_ar)}`}
                onClick={() => void haptic("light")}
                className="snap-start shrink-0 w-[47%] rounded-[22px] ios-card overflow-hidden ios-press"
              >
                <div className="aspect-square bg-white p-3">
                  <LazyImage src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain" />
                </div>
                <div className="p-3.5 space-y-1.5">
                  {p.erp_item_code && (
                    <p className="ar-body text-[10px] text-gold leading-none numeric">{p.erp_item_code}</p>
                  )}
                  {p.part_number && (
                    <p className="font-mono text-[10px] text-white/40 leading-none truncate numeric">
                      {p.part_number}
                    </p>
                  )}
                  <p className="ar-body text-[12.5px] font-semibold leading-snug line-clamp-2 min-h-[2.4rem]">
                    {p.name_ar}
                  </p>
                  {user ? (
                    <p className="ar-display text-[15px] font-bold text-white numeric">
                      {Number(p.base_price || 0).toLocaleString("en-US")} EGP
                    </p>
                  ) : (
                    <p className="ar-body text-[11px] text-white/45">سجّل لرؤية السعر</p>
                  )}
                </div>
              </Link>
            ))}
        </div>
      </motion.section>

      {/* ───────────── Guest CTA ───────────── */}
      {!user && (
        <motion.section {...revealUp} className={`${GUTTER} mt-10`}>
          <div className="rounded-[28px] overflow-hidden relative border border-white/[0.08]">
            <img
              src={bannerGenuine}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/85 to-carbon/60" />
            <div className="relative p-6">
              <p className="eyebrow text-gold">MEMBERS ONLY</p>
              <h3 className="ar-display font-bold text-[19px] mt-2">اعرف أسعارك الخاصة</h3>
              <p className="ar-body text-[13.5px] text-white/60 mt-2">
                سجّل حسابك دلوقتي وشوف الأسعار والعروض المخصصة ليك.
              </p>
              <div className="flex gap-2.5 mt-5">
                <Link
                  to="/auth"
                  onClick={() => void haptic("light")}
                  className="flex-1 h-12 grid place-items-center rounded-full bg-white text-carbon ar-display font-bold text-[14px] ios-press"
                >
                  إنشاء حساب
                </Link>
                <Link
                  to="/dealer-login"
                  onClick={() => void haptic("light")}
                  className="flex-1 h-12 grid place-items-center rounded-full ios-card ar-display font-bold text-[14px] ios-press"
                >
                  دخول التجّار
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ───────────── Maintenance bundles ───────────── */}
      <motion.section {...revealUp} className={`${GUTTER} mt-10`}>
        <Link
          to="/parts-by-type"
          onClick={() => void haptic("light")}
          className="flex items-center gap-3.5 rounded-[22px] ios-card p-4 ios-press"
        >
          <span className="w-11 h-11 rounded-2xl bg-gold/12 grid place-items-center shrink-0">
            <Wrench className="w-5 h-5 text-gold" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="ar-display font-bold text-[15px]">باقات الصيانة الدورية</h3>
            <p className="ar-body text-[12px] text-white/50 mt-1">
              كل قطع صيانة ١٠ / ٢٠ / ٤٠ ألف كم في طلب واحد
            </p>
          </div>
          <ChevronLeft className="w-5 h-5 text-white/30 shrink-0" />
        </Link>
      </motion.section>

      {/* ───────────── Services — grouped list ───────────── */}
      <motion.section {...revealUp} className={`${GUTTER} mt-10`}>
        <GroupTitle>الخدمات</GroupTitle>
        <div className="rounded-[22px] ios-card overflow-hidden">
          {SERVICES.map((s) => (
            <ListRow key={s.to} {...s} />
          ))}
        </div>
      </motion.section>

      {/* ───────────── Dealers ───────────── */}
      <motion.section {...revealUp} className={`${GUTTER} mt-8`}>
        <GroupTitle>بوابة التجّار</GroupTitle>
        <div className="rounded-[22px] ios-card overflow-hidden">
          {DEALER_LINKS.map((s) => (
            <ListRow key={s.to} {...s} />
          ))}
        </div>
      </motion.section>

      {/* ───────────── Guides ───────────── */}
      <motion.section {...revealUp} className="mt-10">
        <SectionHeader title="أدلة ونصائح فنية" to="/guides/identifying-genuine-toyota-parts" />
        <div className={`flex gap-3.5 overflow-x-auto ios-rail ${GUTTER} mt-4 pb-1 snap-x`}>
          {GUIDES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              onClick={() => void haptic("light")}
              className="snap-start shrink-0 w-[64%] rounded-[22px] ios-card p-5 ios-press"
            >
              <BookOpen className="w-5 h-5 text-white/35" />
              <p className="ar-display font-bold text-[14px] leading-[1.5] mt-4">{g.label}</p>
              <span className="ar-body text-[11.5px] text-gold mt-3 inline-block">اقرأ الدليل</span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ───────────── Company ───────────── */}
      <motion.section {...revealUp} className={`${GUTTER} mt-10`}>
        <GroupTitle>المصرية جروب</GroupTitle>
        <div className="rounded-[22px] ios-card overflow-hidden">
          {ABOUT_LINKS.map((a) => (
            <ListRow key={a.to} {...a} />
          ))}
        </div>
      </motion.section>

      {/* ───────────── Contact ───────────── */}
      <section className={`${GUTTER} mt-5`}>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://wa.me/201034806288"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-12 rounded-full bg-[#25D366]/12 border border-[#25D366]/25 ios-press"
          >
            <MessageCircle className="w-[18px] h-[18px] text-[#25D366]" />
            <span className="ar-body text-[13px] font-bold text-[#25D366]">واتساب</span>
          </a>
          <a
            href="tel:+201034806288"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-12 rounded-full ios-card ios-press"
          >
            <Phone className="w-[18px] h-[18px] text-white/80" />
            <span className="ar-body text-[13px] font-bold">اتصل بنا</span>
          </a>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className={`${GUTTER} mt-12 flex flex-col items-center gap-3`}>
        <img src={logoDark} alt="المصرية جروب" className="h-7 w-auto object-contain opacity-70" />
        <p className="ar-body text-[11px] text-white/35 text-center">
          موزّع معتمد لقطع غيار تويوتا — منذ ١٩٩٩
        </p>
      </footer>

      <div className="h-6" />
      </div>
    </div>

  );
};

/* ── Building blocks ─────────────────────────────────────── */

const SectionHeader = ({ title, to }: { title: string; to: string }) => (
  <div className={`${GUTTER}`}>
    <div className="flex items-baseline justify-between">
      <h2 className="ar-display font-bold text-[19px] flex items-center gap-2.5">
        <span className="inline-block w-1 h-5 rounded-full bg-gold" />
        {title}
      </h2>
      <Link
        to={to}
        className="ar-body text-[12.5px] text-gold/85 font-semibold inline-flex items-center gap-0.5 ios-press"
      >
        عرض الكل
        <ChevronLeft className="w-3.5 h-3.5" />
      </Link>
    </div>
    <div className="mt-3 h-px w-full bg-gradient-to-l from-gold/40 via-white/[0.07] to-transparent" />
  </div>
);

const GroupTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="eyebrow text-gold/70 mb-3 px-1 flex items-center gap-2">
    <span className="inline-block w-4 h-px bg-gold/50" />
    {children}
  </h2>
);


const ListRow = ({
  label,
  hint,
  to,
  icon: Icon,
}: {
  label: string;
  hint: string;
  to: string;
  icon: typeof Store;
}) => (
  <Link
    to={to}
    onClick={() => void haptic("light")}
    className="ios-row flex items-center gap-3.5 px-4 py-3.5 active:bg-white/[0.05] transition-colors"
  >
    <span className="w-9 h-9 rounded-xl bg-white/[0.07] grid place-items-center shrink-0">
      <Icon className="w-[17px] h-[17px] text-white/70" />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block ar-body text-[14px] font-semibold leading-tight">{label}</span>
      <span className="block ar-body text-[11.5px] text-white/40 mt-0.5 leading-tight">{hint}</span>
    </span>
    <ChevronLeft className="w-[18px] h-[18px] text-white/25 shrink-0" />
  </Link>
);

export default NativeHomeScreen;
