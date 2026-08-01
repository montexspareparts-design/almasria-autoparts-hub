import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Truck,
  Headphones,
  ChevronLeft,
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
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { LazyImage } from "@/components/ui/lazy-image";
import { haptic } from "@/lib/haptics";
import { easeOutIOS, revealUp } from "@/lib/motion";
import logoDark from "@/assets/almasria-logo-dark.png";
import {
  GUTTER,
  SectionHeader,
  GroupTitle,
  ListRow,
  PriceDisplay,
  PartNumber,
  AvailabilityBadge,
  CompatibilityBadge,
  Skeleton,
} from "@/components/native/ui/primitives";

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
   Native home — "Precision Luxury Commerce".
   Calm neutral canvas, navy brand chrome, one interactive accent.
   Search and vehicle compatibility sit at the top of the hierarchy;
   products stay the visual priority. Routes and data bindings are
   unchanged — this file is presentation only.
   ──────────────────────────────────────────────────────────── */

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
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
    <div dir="rtl" className="n-screen ar-body pb-2">
      {/* ═══════ Compact sticky chrome — appears after the brand block ═══════ */}
      <motion.header
        animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : -10 }}
        transition={{ duration: 0.22, ease: easeOutIOS }}
        className={`fixed top-0 inset-x-0 z-40 ${scrolled ? "" : "pointer-events-none"}`}
      >
        <div className="n-chrome rounded-none border-x-0 border-t-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className={`h-[52px] flex items-center justify-between gap-3 ${GUTTER}`}>
            <span
              className="flex items-center justify-center h-8 px-2.5 rounded-lg"
              style={{ background: "hsl(var(--n-brand))" }}
            >
              <img src={logoDark} alt="المصرية جروب" className="h-5 w-auto object-contain" />
            </span>
            <button
              type="button"
              onClick={() => {
                void haptic("light");
                document.getElementById("n-home-search")?.focus();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex-1 flex items-center gap-2 h-9 px-3 rounded-full n-press"
              style={{ background: "hsl(var(--n-surface-2))" }}
              aria-label="ابحث في الكتالوج"
            >
              <Search className="w-4 h-4 text-[hsl(var(--n-text-3))]" />
              <span className="ar-body text-[12.5px] text-[hsl(var(--n-text-3))]">ابحث بالكود أو البارت نمبر</span>
            </button>
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="w-9 h-9 rounded-full grid place-items-center n-press shrink-0"
              style={{ background: "hsl(var(--n-surface-2))" }}
            >
              <Bell className="w-[17px] h-[17px] text-[hsl(var(--n-text-2))]" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ═══════ Brand block — restrained navy, not a banner wall ═══════ */}
      <section
        className="relative"
        style={{ background: "hsl(var(--n-brand))", color: "#fff" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(120% 90% at 85% 0%, hsl(var(--n-brand-2)) 0%, transparent 60%)",
          }}
        />
        <div
          className={`relative ${GUTTER} pb-12`}
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
        >
          <div className="flex items-center justify-between">
            <img src={logoDark} alt="المصرية جروب" className="h-9 w-auto object-contain" />
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="w-10 h-10 rounded-full grid place-items-center n-press bg-white/10 border border-white/15"
            >
              <Bell className="w-[18px] h-[18px] text-white/85" />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOutIOS }}
            className="mt-8"
          >
            <div className="flex items-center gap-2">
              <span className="h-px w-6" style={{ background: "hsl(var(--n-gold))" }} />
              <p className="eyebrow" style={{ color: "hsl(var(--n-gold))" }}>
                AUTHORIZED DISTRIBUTOR · SINCE 1999
              </p>
            </div>
            <h1 className="ar-display font-black text-[27px] leading-[1.42] mt-3">
              قطع غيار تويوتا الأصلية
              <br />
              <span className="text-white/70 font-bold text-[19px]">بضمان الموزّع المعتمد</span>
            </h1>
          </motion.div>
        </div>
      </section>

      {/* ═══════ Primary search — the app's most important control ═══════ */}
      <div className={`${GUTTER} -mt-7 relative z-10`}>
        <form onSubmit={submitSearch}>
          <label htmlFor="n-home-search" className="sr-only">
            بحث في كتالوج القطع
          </label>
          <div
            className="flex items-center gap-2.5 h-[54px] px-4 rounded-[18px]"
            style={{
              background: "hsl(var(--n-surface))",
              border: "1px solid hsl(var(--n-border))",
              boxShadow: "var(--n-elev-3)",
            }}
          >
            <Search className="w-[19px] h-[19px] text-[hsl(var(--n-text-3))] shrink-0" aria-hidden />
            <input
              id="n-home-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بكود الصنف أو البارت نمبر"
              className="flex-1 min-w-0 bg-transparent outline-none ar-body text-[15px] text-[hsl(var(--n-text))] placeholder:text-[hsl(var(--n-text-3))]"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
            />
            <button
              type="submit"
              aria-label="ابحث"
              className="shrink-0 w-9 h-9 rounded-full grid place-items-center n-press"
              style={{ background: "hsl(var(--n-accent))" }}
            >
              <ArrowLeft className="w-[18px] h-[18px] text-white" />
            </button>
          </div>
        </form>
      </div>

      {/* ═══════ Vehicle module — compatibility is the core promise ═══════ */}
      <motion.section {...revealUp} className={`${GUTTER} mt-5`}>
        <div className="n-card p-4">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
              style={{ background: "hsl(var(--n-accent) / 0.10)" }}
            >
              <Car className="w-5 h-5" style={{ color: "hsl(var(--n-accent))" }} />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="ar-display font-bold text-[15.5px] text-[hsl(var(--n-text))]">اختر عربيتك</h2>
              <p className="ar-body text-[12px] text-[hsl(var(--n-text-2))] mt-1">
                علشان نعرضلك القطع المطابقة لموديلك بس
              </p>
            </div>
            <CompatibilityBadge state="no-vehicle" label="لم تُحدَّد" compact />
          </div>

          <div className="n-rail gap-2 mt-3.5 -mx-1 px-1 pb-0.5">
            {MODELS.map((m) => (
              <Link
                key={m.slug}
                to={`/parts-by-model/${m.slug}`}
                onClick={() => void haptic("light")}
                className="shrink-0 inline-flex items-center h-10 px-4 rounded-full ar-body text-[13px] font-bold n-press"
                style={{
                  background: "hsl(var(--n-surface-2))",
                  color: "hsl(var(--n-text))",
                }}
              >
                {m.label}
              </Link>
            ))}
            <Link
              to="/parts-by-model"
              onClick={() => void haptic("light")}
              className="shrink-0 inline-flex items-center gap-1 h-10 px-4 rounded-full ar-body text-[13px] font-bold n-press"
              style={{ background: "hsl(var(--n-accent) / 0.10)", color: "hsl(var(--n-accent))" }}
            >
              كل الموديلات
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ═══════ Trust — quiet reassurance, no claims invented ═══════ */}
      <section className={`${GUTTER} mt-3`}>
        <div className="flex items-center justify-between gap-2 px-1">
          {[
            { icon: ShieldCheck, label: "ضمان أصالة" },
            { icon: Truck, label: "توصيل ٤٨ ساعة" },
            { icon: Headphones, label: "دعم فني" },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-1.5 min-w-0">
              <t.icon className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--n-success))" }} aria-hidden />
              <span className="ar-body text-[11.5px] font-semibold text-[hsl(var(--n-text-2))] truncate">
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ Categories ═══════ */}
      <motion.section {...revealUp} className="mt-8">
        <SectionHeader title="تسوّق حسب الفئة" to="/products" />
        <div className={`grid grid-cols-2 gap-3 ${GUTTER} mt-3.5`}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/products?category=${c.slug}`}
              onClick={() => void haptic("light")}
              className="n-card overflow-hidden n-press"
            >
              <div className="aspect-[5/4]" style={{ background: "hsl(var(--n-image-bg))" }}>
                <img
                  src={c.img}
                  alt={c.label}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-3.5 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="ar-display font-bold text-[14.5px] leading-none text-[hsl(var(--n-text))] truncate">
                    {c.label}
                  </p>
                  <p className="ar-body text-[11px] text-[hsl(var(--n-text-3))] mt-1.5 truncate">{c.sub}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-[hsl(var(--n-text-3))] shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ═══════ New arrivals ═══════ */}
      <motion.section {...revealUp} className="mt-9">
        <SectionHeader title="وصل حديثاً" to="/products" />
        <div className={`n-rail gap-3 ${GUTTER} mt-3.5 pb-1 snap-x`}>
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[46%] n-card overflow-hidden">
                <Skeleton className="aspect-square rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-2.5 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-4 w-2/5" />
                </div>
              </div>
            ))}

          {!isLoading &&
            products.map((p: any) => (
              <Link
                key={p.id}
                to={`/products?search=${encodeURIComponent(p.sku || p.name_ar)}`}
                onClick={() => void haptic("light")}
                className="snap-start shrink-0 w-[46%] n-card overflow-hidden n-press flex flex-col"
              >
                <div
                  className="aspect-square p-3 border-b"
                  style={{ background: "hsl(var(--n-image-bg))", borderColor: "hsl(var(--n-divider))" }}
                >
                  <LazyImage src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain" />
                </div>
                <div className="p-3 flex-1 flex flex-col gap-1.5">
                  {p.erp_item_code && (
                    <span className="n-code text-[10.5px] font-bold" style={{ color: "hsl(var(--n-accent))" }}>
                      {p.erp_item_code}
                    </span>
                  )}
                  {p.part_number && <PartNumber value={p.part_number} copyable={false} />}
                  <p className="ar-body text-[12.5px] font-semibold leading-snug line-clamp-2 text-[hsl(var(--n-text))]">
                    {p.name_ar}
                  </p>
                  <div className="mt-auto pt-2 flex flex-col gap-1.5">
                    <span className="block">
                      <AvailabilityBadge state="in-stock" />
                    </span>
                    <span className="block">
                      <PriceDisplay value={user ? Number(p.base_price || 0) : null} locked={!user} size="sm" />
                    </span>
                  </div>

                </div>
              </Link>
            ))}
        </div>
      </motion.section>

      {/* ═══════ Editorial features ═══════ */}
      <motion.section {...revealUp} className="mt-9">
        <SectionHeader title="مختارات المصرية" to="/products" />
        <div className={`n-rail gap-3.5 ${GUTTER} mt-3.5 pb-1 snap-x snap-mandatory`}>
          {EDITORIAL.map((b) => (
            <Link
              key={b.to}
              to={b.to}
              onClick={() => void haptic("light")}
              className="snap-center shrink-0 w-[80%] n-card overflow-hidden n-press"
            >
              <div className="relative h-[152px]">
                <img src={b.img} alt="" aria-hidden loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(213_65%_11%/0.85)] to-transparent" />
                <p className="absolute top-3.5 start-4 eyebrow text-white/85">{b.kicker}</p>
              </div>
              <div className="p-4">
                <h3 className="ar-display font-bold text-[16.5px] leading-snug text-[hsl(var(--n-text))]">
                  {b.title}
                </h3>
                <p className="ar-body text-[12.5px] leading-[1.7] text-[hsl(var(--n-text-2))] mt-1.5">{b.sub}</p>
                <span
                  className="inline-flex items-center gap-1 ar-body text-[12.5px] font-bold mt-3"
                  style={{ color: "hsl(var(--n-accent))" }}
                >
                  اعرف أكتر
                  <ChevronLeft className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ═══════ Brands ═══════ */}
      <motion.section {...revealUp} className="mt-9">
        <SectionHeader title="ماركاتنا" to="/products" />
        <div className={`n-rail gap-2.5 ${GUTTER} mt-3.5 pb-1`}>
          {BRANDS.map((b) => (
            <Link
              key={b.to}
              to={b.to}
              onClick={() => void haptic("light")}
              className="shrink-0 w-[102px] n-card p-3 n-press"
            >
              <div className="h-11 grid place-items-center rounded-lg" style={{ background: "hsl(var(--n-image-bg))" }}>
                <img src={b.img} alt={b.label} loading="lazy" className="max-h-10 w-auto object-contain" />
              </div>
              <p className="ar-body text-[10.5px] font-bold text-center mt-2 leading-tight text-[hsl(var(--n-text-2))]">
                {b.label}
              </p>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ═══════ Stats — hairline row ═══════ */}
      <section className={`${GUTTER} mt-9`}>
        <div className="n-card flex items-stretch py-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="flex-1 text-center"
              style={i > 0 ? { borderInlineEnd: "1px solid hsl(var(--n-divider))" } : undefined}
            >
              <p className="ar-display font-black text-[21px] leading-none n-num text-[hsl(var(--n-text))]">
                {s.value}
              </p>
              <p className="ar-body text-[11px] text-[hsl(var(--n-text-3))] mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ Guest CTA ═══════ */}
      {!user && (
        <motion.section {...revealUp} className={`${GUTTER} mt-8`}>
          <div
            className="rounded-[20px] overflow-hidden p-5"
            style={{ background: "hsl(var(--n-brand))", color: "#fff" }}
          >
            <p className="eyebrow" style={{ color: "hsl(var(--n-gold))" }}>
              MEMBERS ONLY
            </p>
            <h3 className="ar-display font-bold text-[18px] mt-2">اعرف أسعارك الخاصة</h3>
            <p className="ar-body text-[13px] leading-[1.7] text-white/70 mt-2">
              سجّل حسابك دلوقتي وشوف الأسعار والعروض المخصصة ليك.
            </p>
            <div className="flex gap-2.5 mt-4">
              <Link
                to="/auth"
                onClick={() => void haptic("light")}
                className="flex-1 h-12 grid place-items-center rounded-full bg-white ar-display font-bold text-[14px] n-press"
                style={{ color: "hsl(var(--n-brand))" }}
              >
                إنشاء حساب
              </Link>
              <Link
                to="/dealer-login"
                onClick={() => void haptic("light")}
                className="flex-1 h-12 grid place-items-center rounded-full border border-white/25 bg-white/10 ar-display font-bold text-[14px] text-white n-press"
              >
                دخول التجّار
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* ═══════ Maintenance bundles ═══════ */}
      <motion.section {...revealUp} className={`${GUTTER} mt-8`}>
        <Link
          to="/parts-by-type"
          onClick={() => void haptic("light")}
          className="flex items-center gap-3.5 n-card p-4 n-press"
        >
          <span
            className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
            style={{ background: "hsl(var(--n-gold) / 0.14)" }}
          >
            <Wrench className="w-5 h-5" style={{ color: "hsl(var(--n-gold))" }} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="ar-display font-bold text-[15px] text-[hsl(var(--n-text))]">باقات الصيانة الدورية</h3>
            <p className="ar-body text-[12px] text-[hsl(var(--n-text-2))] mt-1">
              كل قطع صيانة ١٠ / ٢٠ / ٤٠ ألف كم في طلب واحد
            </p>
          </div>
          <ChevronLeft className="w-5 h-5 text-[hsl(var(--n-text-3))] shrink-0" />
        </Link>
      </motion.section>

      {/* ═══════ Services ═══════ */}
      <motion.section {...revealUp} className={`${GUTTER} mt-8`}>
        <GroupTitle>الخدمات</GroupTitle>
        <div className="n-group">
          {SERVICES.map((s) => (
            <ListRow key={s.to} {...s} />
          ))}
        </div>
      </motion.section>

      {/* ═══════ Dealers ═══════ */}
      <motion.section {...revealUp} className={`${GUTTER} mt-7`}>
        <GroupTitle>بوابة التجّار</GroupTitle>
        <div className="n-group">
          {DEALER_LINKS.map((s) => (
            <ListRow key={s.to} {...s} />
          ))}
        </div>
      </motion.section>

      {/* ═══════ Guides ═══════ */}
      <motion.section {...revealUp} className="mt-9">
        <SectionHeader title="أدلة ونصائح فنية" to="/guides/identifying-genuine-toyota-parts" action="الكل" />
        <div className={`n-rail gap-3 ${GUTTER} mt-3.5 pb-1 snap-x`}>
          {GUIDES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              onClick={() => void haptic("light")}
              className="snap-start shrink-0 w-[62%] n-card p-4 n-press"
            >
              <BookOpen className="w-5 h-5" style={{ color: "hsl(var(--n-accent))" }} />
              <p className="ar-display font-bold text-[14px] leading-[1.55] mt-3 text-[hsl(var(--n-text))]">
                {g.label}
              </p>
              <span
                className="ar-body text-[11.5px] font-bold mt-2.5 inline-block"
                style={{ color: "hsl(var(--n-accent))" }}
              >
                اقرأ الدليل
              </span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ═══════ Company ═══════ */}
      <motion.section {...revealUp} className={`${GUTTER} mt-9`}>
        <GroupTitle>المصرية جروب</GroupTitle>
        <div className="n-group">
          {ABOUT_LINKS.map((a) => (
            <ListRow key={a.to} {...a} />
          ))}
        </div>
      </motion.section>

      {/* ═══════ Contact ═══════ */}
      <section className={`${GUTTER} mt-4`}>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://wa.me/201034806288"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-12 rounded-full n-press"
            style={{ background: "hsl(var(--n-surface))", border: "1px solid hsl(var(--n-border))" }}
          >
            <MessageCircle className="w-[18px] h-[18px] text-[#1DA851]" />
            <span className="ar-body text-[13px] font-bold text-[hsl(var(--n-text))]">واتساب</span>
          </a>
          <a
            href="tel:+201034806288"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-12 rounded-full n-press"
            style={{ background: "hsl(var(--n-surface))", border: "1px solid hsl(var(--n-border))" }}
          >
            <Phone className="w-[18px] h-[18px]" style={{ color: "hsl(var(--n-accent))" }} />
            <span className="ar-body text-[13px] font-bold text-[hsl(var(--n-text))]">اتصل بنا</span>
          </a>
        </div>
      </section>

      {/* ═══════ Footer ═══════ */}
      <footer className={`${GUTTER} mt-10 flex flex-col items-center gap-3`}>
        <span className="px-3 py-2 rounded-xl" style={{ background: "hsl(var(--n-brand))" }}>
          <img src={logoDark} alt="المصرية جروب" className="h-6 w-auto object-contain" />
        </span>
        <p className="ar-body text-[11px] text-[hsl(var(--n-text-3))] text-center">
          موزّع معتمد لقطع غيار تويوتا — منذ ١٩٩٩
        </p>
      </footer>

      <div className="h-4" />
    </div>
  );
};

export default NativeHomeScreen;
