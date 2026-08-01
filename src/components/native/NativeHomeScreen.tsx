import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search,
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
  Plus,
  FileText,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { LazyImage } from "@/components/ui/lazy-image";
import { haptic } from "@/lib/haptics";
import { easeOutIOS } from "@/lib/motion";
import logoDark from "@/assets/almasria-logo-dark.png";
import { GUTTER, Skeleton } from "@/components/native/ui/primitives";

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
   Native home — "Parts Command Center".
   One connected graphite command surface (identity + search +
   real vehicle context), then a hairline, typographic catalog.
   Brand system derived from the real Al Masria mark: graphite
   ink + Al Masria red. Presentation only — every route, query
   and data binding is unchanged.
   ──────────────────────────────────────────────────────────── */

const HAIR = "1px solid hsl(var(--n-divider))";
const HAIR_LIGHT = "1px solid hsl(0 0% 100% / 0.10)";

const SEARCH_SCOPES = [
  { key: "all", label: "الكل", hint: "ابحث بالكود أو البارت نمبر أو الاسم" },
  { key: "code", label: "كود الصنف", hint: "مثال: 12918" },
  { key: "part", label: "بارت نمبر", hint: "مثال: 90919-01275" },
  { key: "name", label: "اسم القطعة", hint: "مثال: فلتر زيت كورولا" },
];

const CATEGORIES = [
  { slug: "filters", label: "فلاتر", sub: "زيت • هواء • مكيف", en: "FILTRATION", img: catFilters },
  { slug: "oils-gasoline", label: "زيوت", sub: "محرك • فتيس", en: "LUBRICANTS", img: catOils },
  { slug: "brakes", label: "فرامل", sub: "تيل • هوبات", en: "BRAKING", img: catBrakes },
  { slug: "electrical", label: "كهرباء", sub: "بوجيهات • دينمو", en: "ELECTRICAL", img: catElectrical },
  { slug: "belts-bearings", label: "سيور", sub: "كاويتش • رمان", en: "DRIVE", img: catBelts },
  { slug: "water-cooling", label: "تبريد", sub: "رادياتير • طلمبة", en: "COOLING", img: catCooling },
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
    sub: "كل درجات اللزوجة",
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

/* B2B quick actions — existing dealer routes only */
const DEALER_ACTIONS = [
  { label: "طلب سريع", hint: "بكود الصنف", to: "/dealer?tab=quick-order", icon: Plus },
  { label: "طلباتي", hint: "المتابعة وإعادة الطلب", to: "/dealer?tab=orders", icon: ClipboardList },
  { label: "كشف الحساب", hint: "الرصيد والفواتير", to: "/dealer?tab=statement", icon: FileText },
];

const BRANDS = [
  { label: "تويوتا الأصلية", en: "TOYOTA GENUINE PARTS", img: brandGenuine, to: "/products/toyota-genuine" },
  { label: "زيوت تويوتا", en: "TOYOTA MOTOR OIL", img: brandOil, to: "/products/toyota-oils" },
  { label: "MTX", en: "AL MASRIA OWN BRAND", img: brandMtxLogo, to: "/products/mtx-aftermarket" },
  { label: "DENSO", en: "OEM SUPPLIER — JAPAN", img: brandDenso, to: "/products/denso" },
  { label: "AISIN", en: "OEM SUPPLIER — JAPAN", img: brandAisin, to: "/products/aisin" },
  { label: "FBK", en: "BRAKING SPECIALIST", img: brandFbk, to: "/products/fbk-brakes" },
];

const MODELS = [
  { label: "هايس", en: "HIACE", slug: "hiace" },
  { label: "كوستر", en: "COASTER", slug: "coaster" },
  { label: "هايلوكس", en: "HILUX", slug: "hilux" },
  { label: "لاند كروزر", en: "LAND CRUISER", slug: "land-cruiser" },
  { label: "ياريس", en: "YARIS", slug: "yaris" },
  { label: "كورولا", en: "COROLLA", slug: "corolla" },
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
  { value: "1999", label: "بداية النشاط" },
  { value: "12K+", label: "صنف متاح" },
  { value: "48h", label: "زمن التوصيل" },
];

/* Hairline navigation row — no card, icon reads as a technical mark */
const HairRow = ({
  label,
  hint,
  to,
  icon: Icon,
}: {
  label: string;
  hint: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <Link
    to={to}
    onClick={() => void haptic("light")}
    className="flex items-center gap-3.5 py-3.5 n-press"
    style={{ borderBottom: HAIR, minHeight: 44 }}
  >
    <Icon className="w-[18px] h-[18px] shrink-0 text-[hsl(var(--n-text-2))]" />
    <span className="flex-1 min-w-0">
      <span className="block ar-display font-bold text-[14.5px] text-[hsl(var(--n-text))] leading-none">
        {label}
      </span>
      <span className="block ar-body text-[11.5px] text-[hsl(var(--n-text-3))] mt-1.5 truncate">{hint}</span>
    </span>
    <ChevronLeft className="w-4 h-4 shrink-0 text-[hsl(var(--n-text-3))]" />
  </Link>
);

/* Two-digit technical index, e.g. 01 / 02 */
const idx = (i: number) => String(i + 1).padStart(2, "0");

/* Section label — typographic, no container */
const SectionLead = ({
  en,
  title,
  to,
}: {
  en: string;
  title: string;
  to?: string;
}) => (
  <div className="flex items-baseline justify-between gap-3">
    <div className="min-w-0">
      <span className="n-code text-[9.5px] tracking-[0.2em] text-[hsl(var(--n-text-3))]">{en}</span>
      <h2 className="ar-display font-black text-[19px] text-[hsl(var(--n-text))] mt-1.5">{title}</h2>
    </div>
    {to && (
      <Link
        to={to}
        onClick={() => void haptic("light")}
        className="shrink-0 ar-body text-[12.5px] font-bold n-press py-1"
        style={{ color: "hsl(var(--n-accent))" }}
      >
        الكل
      </Link>
    )}
  </div>
);

const NativeHomeScreen = () => {
  const navigate = useNavigate();
  const { user, isDealer } = useAuth();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [focused, setFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 150);
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

  /* Real vehicle context from the customer's own profile — never sample data */
  const { data: vehicle } = useQuery({
    queryKey: ["native_home_vehicle", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("car_model, car_year")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasVehicle = !!vehicle?.car_model;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void haptic("light");
    if (!query.trim()) return navigate("/products");
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const activeScope = SEARCH_SCOPES.find((s) => s.key === scope) ?? SEARCH_SCOPES[0];
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-40px" },
        transition: { duration: 0.32, ease: easeOutIOS },
      };

  return (
    <div dir="rtl" className="ar-body" style={{ background: "hsl(var(--n-bg))" }}>
      {/* ══ Condensed chrome on scroll ══ */}
      <motion.header
        animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : -8 }}
        transition={{ duration: 0.18, ease: easeOutIOS }}
        className={`fixed top-0 inset-x-0 z-40 ${scrolled ? "" : "pointer-events-none"}`}
      >
        <div className="n-ink" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className={`h-[50px] flex items-center gap-3 ${GUTTER}`}>
            <img src={logoDark} alt="المصرية جروب" className="h-[18px] w-auto object-contain shrink-0" />
            <button
              type="button"
              onClick={() => {
                void haptic("light");
                window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
                setTimeout(() => inputRef.current?.focus(), 360);
              }}
              className="flex-1 flex items-center gap-2 h-[34px] px-3 n-press min-w-0"
              style={{ background: "hsl(0 0% 100% / 0.09)", borderRadius: 8 }}
              aria-label="ابحث في الكتالوج"
            >
              <Search className="w-[15px] h-[15px] text-white/55 shrink-0" aria-hidden />
              <span className="n-code text-[11px] text-white/55 truncate">SEARCH CATALOGUE</span>
            </button>
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="w-11 h-11 -me-2 grid place-items-center n-press shrink-0"
            >
              <Bell className="w-[18px] h-[18px] text-white/75" aria-hidden />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ══════════ COMMAND HEADER — identity · search · vehicle ══════════ */}
      <section className="relative overflow-hidden n-ink">
        <div aria-hidden className="absolute inset-0 n-grid-rule" />

        <div className={`relative ${GUTTER}`} style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
          {/* identity */}
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center gap-3 min-w-0">
              <img src={logoDark} alt="المصرية جروب" className="h-[26px] w-auto object-contain" />
              <span className="w-px h-5 bg-white/15" aria-hidden />
              <span className="n-code text-[9px] tracking-[0.14em] text-white/45 leading-[1.45]">
                AUTHORIZED
                <br />
                TOYOTA PARTS
              </span>
            </div>
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="w-11 h-11 -me-2 grid place-items-center n-press"
            >
              <Bell className="w-[18px] h-[18px] text-white/70" aria-hidden />
            </Link>
          </div>

          {/* statement */}
          <h1 className="ar-display font-black text-[26px] leading-[1.45] mt-6">
            القطعة الصح
            <br />
            <span className="text-white/40">من أول مرة</span>
          </h1>
          <p className="ar-body text-[12.5px] leading-[1.8] text-white/50 mt-2 max-w-[300px]">
            كتالوج تويوتا كامل — ابحث بكود الصنف أو البارت نمبر أو اسم القطعة أو العلامة.
          </p>

          {/* ── search console ── */}
          <form onSubmit={submitSearch} className="mt-5 pb-5">
            <div
              style={{
                background: "hsl(var(--n-surface))",
                borderRadius: 10,
                boxShadow: focused
                  ? "0 0 0 2px hsl(var(--n-accent)), 0 16px 34px -20px hsl(0 0% 0% / 0.8)"
                  : "0 16px 34px -22px hsl(0 0% 0% / 0.75)",
                transition: "box-shadow var(--n-dur-fast) var(--n-ease)",
                overflow: "hidden",
              }}
            >
              {/* scope strip — filled active state, no underline */}
              <div
                className="flex items-stretch"
                style={{ borderBottom: HAIR, background: "hsl(var(--n-surface-2))" }}
                role="tablist"
                aria-label="نطاق البحث"
              >
                {SEARCH_SCOPES.map((s) => {
                  const on = s.key === scope;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => {
                        void haptic("light");
                        setScope(s.key);
                        inputRef.current?.focus();
                      }}
                      className="flex-1 h-[36px] ar-body text-[11.5px] n-press"
                      style={{
                        color: on ? "hsl(var(--n-text-on-brand))" : "hsl(var(--n-text-3))",
                        background: on ? "hsl(var(--n-ink))" : "transparent",
                        fontWeight: on ? 800 : 600,
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* input row */}
              <div className="flex items-center gap-2 h-[54px] ps-4 pe-2">
                <Search className="w-[19px] h-[19px] shrink-0 text-[hsl(var(--n-text-3))]" aria-hidden />
                <label htmlFor="n-home-search" className="sr-only">
                  {activeScope.hint}
                </label>
                <input
                  id="n-home-search"
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={activeScope.hint}
                  className={`flex-1 min-w-0 bg-transparent outline-none text-[14.5px] text-[hsl(var(--n-text))] placeholder:text-[hsl(var(--n-text-3))] ${
                    scope === "code" || scope === "part" ? "n-code" : "ar-body"
                  }`}
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  aria-label="ابحث"
                  className="shrink-0 h-[44px] px-4 grid place-items-center n-press"
                  style={{ background: "hsl(var(--n-accent))", borderRadius: 8, minWidth: 62 }}
                >
                  <span className="ar-body text-[13px] font-bold text-white">بحث</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── vehicle context, welded to the search console ── */}
        <div className="relative n-ink-2" style={{ borderTop: HAIR_LIGHT }}>
          <div className={`${GUTTER} py-3 flex items-center gap-2.5`}>
            <Car className="w-[16px] h-[16px] shrink-0 text-white/45" aria-hidden />
            {hasVehicle ? (
              <>
                <span className="min-w-0">
                  <span className="block ar-display font-bold text-[13.5px] text-white leading-none">
                    {vehicle?.car_model}
                    {vehicle?.car_year ? (
                      <span className="n-num font-semibold text-white/60 ms-2">{vehicle.car_year}</span>
                    ) : null}
                  </span>
                  <span className="block ar-body text-[10.5px] text-white/45 mt-1.5">
                    ابحث عن القطع المناسبة لعربيتك
                  </span>
                </span>
                <Link
                  to="/my-profile"
                  onClick={() => void haptic("light")}
                  className="ms-auto shrink-0 ar-body text-[11.5px] font-bold n-press py-2"
                  style={{ color: "hsl(var(--n-gold))" }}
                >
                  تغيير
                </Link>
              </>
            ) : (
              <>
                <span className="min-w-0">
                  <span className="block ar-display font-bold text-[13.5px] text-white leading-none">
                    لسه محددتش عربيتك
                  </span>
                  <span className="block ar-body text-[10.5px] text-white/45 mt-1.5">
                    حدّد الموديل والسنة عشان نرشّح لك القطع المناسبة
                  </span>
                </span>
                <Link
                  to={user ? "/my-profile" : "/parts-by-model"}
                  onClick={() => void haptic("light")}
                  className="ms-auto shrink-0 ar-body text-[11.5px] font-bold n-press py-2"
                  style={{ color: "hsl(var(--n-gold))" }}
                >
                  حدّد عربيتك
                </Link>
              </>
            )}
          </div>

          {/* model rail */}
          <div className={`n-rail ${GUTTER} pb-3.5 gap-0`} style={{ borderTop: HAIR_LIGHT, paddingTop: 12 }}>
            {MODELS.map((m, i) => (
              <Link
                key={m.slug}
                to={`/parts-by-model/${m.slug}`}
                onClick={() => void haptic("light")}
                className="shrink-0 min-h-[44px] flex flex-col justify-center pe-5 n-press"
                style={
                  i < MODELS.length - 1
                    ? { borderInlineEnd: HAIR_LIGHT, marginInlineEnd: 20 }
                    : undefined
                }
              >
                <span className="ar-display font-bold text-[14.5px] text-white leading-none">{m.label}</span>
                <span className="n-code text-[8.5px] tracking-[0.12em] text-white/35 mt-1.5">{m.en}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ B2B command strip — dealer-only, existing routes ══ */}
      {isDealer && (
        <section className="grid grid-cols-3" style={{ borderBottom: HAIR, background: "hsl(var(--n-surface))" }}>
          {DEALER_ACTIONS.map((a, i) => (
            <Link
              key={a.to}
              to={a.to}
              onClick={() => void haptic("light")}
              className="flex flex-col items-center justify-center gap-1.5 py-3.5 n-press"
              style={i < DEALER_ACTIONS.length - 1 ? { borderInlineEnd: HAIR } : undefined}
            >
              <a.icon className="w-[18px] h-[18px]" style={{ color: "hsl(var(--n-accent))" }} aria-hidden />
              <span className="ar-display font-bold text-[12.5px] text-[hsl(var(--n-text))]">{a.label}</span>
              <span className="ar-body text-[10px] text-[hsl(var(--n-text-3))]">{a.hint}</span>
            </Link>
          ))}
        </section>
      )}

      {/* ══ Editorial lead ══ */}
      <motion.section {...reveal}>
        <Link
          to={EDITORIAL[0].to}
          onClick={() => void haptic("light")}
          className="block relative n-press"
          style={{ height: 240 }}
        >
          <img src={EDITORIAL[0].img} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, hsl(30 10% 6% / 0.95) 0%, hsl(30 10% 6% / 0.55) 42%, transparent 84%)",
            }}
          />
          <div className={`absolute inset-x-0 bottom-0 ${GUTTER} pb-5`}>
            <div className="flex items-center gap-2">
              <span className="h-px w-5" style={{ background: "hsl(var(--n-accent))" }} aria-hidden />
              <span className="n-code text-[9.5px] tracking-[0.2em]" style={{ color: "hsl(var(--n-gold))" }}>
                {EDITORIAL[0].kicker}
              </span>
            </div>
            <h2 className="ar-display font-black text-[22px] text-white leading-[1.45] mt-2.5">
              {EDITORIAL[0].title}
            </h2>
            <p className="ar-body text-[12.5px] text-white/65 mt-1.5">{EDITORIAL[0].sub}</p>
          </div>
        </Link>
      </motion.section>

      {/* ══ Catalogue index ══ */}
      <motion.section {...reveal} className={`${GUTTER} mt-9`}>
        <SectionLead en="CATALOGUE INDEX" title="الأقسام الرئيسية" to="/products" />

        <div className="mt-4">
          <Link
            to={`/products?category=${CATEGORIES[0].slug}`}
            onClick={() => void haptic("light")}
            className="relative block overflow-hidden n-press"
            style={{ borderRadius: 10, height: 128 }}
          >
            <img src={CATEGORIES[0].img} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to left, transparent 12%, hsl(30 10% 7% / 0.93) 62%)" }}
            />
            <div className="absolute inset-y-0 start-0 flex flex-col justify-center ps-4">
              <span className="n-code text-[9.5px] tracking-[0.18em] text-white/45">
                {idx(0)} · {CATEGORIES[0].en}
              </span>
              <span className="ar-display font-black text-[20px] text-white leading-none mt-2">
                {CATEGORIES[0].label}
              </span>
              <span className="ar-body text-[11.5px] text-white/60 mt-2">{CATEGORIES[0].sub}</span>
            </div>
          </Link>

          <div className="mt-1" style={{ borderTop: HAIR }}>
            {CATEGORIES.slice(1).map((c, i) => (
              <Link
                key={c.slug}
                to={`/products?category=${c.slug}`}
                onClick={() => void haptic("light")}
                className="flex items-center gap-3.5 py-3 n-press"
                style={{ borderBottom: HAIR, minHeight: 44 }}
              >
                <span className="n-code text-[10px] tracking-[0.1em] w-6 shrink-0 text-[hsl(var(--n-text-3))]">
                  {idx(i + 1)}
                </span>
                <span
                  className="w-[46px] h-[46px] shrink-0 overflow-hidden"
                  style={{ borderRadius: 6, background: "hsl(var(--n-image-bg))" }}
                >
                  <img src={c.img} alt="" aria-hidden loading="lazy" className="w-full h-full object-cover" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block ar-display font-bold text-[15px] text-[hsl(var(--n-text))] leading-none">
                    {c.label}
                  </span>
                  <span className="block ar-body text-[11.5px] text-[hsl(var(--n-text-3))] mt-1.5 truncate">
                    {c.sub}
                  </span>
                </span>
                <ChevronLeft className="w-4 h-4 shrink-0 text-[hsl(var(--n-text-3))]" />
              </Link>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ══ Technical product presentation — hairline rows, no cards ══ */}
      <motion.section {...reveal} className={`${GUTTER} mt-10`}>
        <SectionLead en="LATEST STOCK" title="وصل حديثاً" to="/products" />

        <div className="mt-4" style={{ borderTop: HAIR }}>
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 py-3.5" style={{ borderBottom: HAIR }}>
                <Skeleton className="w-[68px] h-[68px] rounded-[8px] shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-2.5 w-1/3" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}

          {!isLoading &&
            products.slice(0, 6).map((p: any) => (
              <Link
                key={p.id}
                to={`/products?search=${encodeURIComponent(p.sku || p.name_ar)}`}
                onClick={() => void haptic("light")}
                className="flex items-stretch gap-3.5 py-3.5 n-press"
                style={{ borderBottom: HAIR, minHeight: 44 }}
              >
                <span
                  className="w-[72px] h-[72px] shrink-0 p-1.5 overflow-hidden"
                  style={{ background: "hsl(var(--n-image-bg))", borderRadius: 8 }}
                >
                  <LazyImage src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain" />
                </span>

                <span className="flex-1 min-w-0 flex flex-col">
                  {p.brand && (
                    <span className="n-code text-[9px] tracking-[0.16em] text-[hsl(var(--n-text-3))] uppercase">
                      {String(p.brand).replace(/_/g, " ")}
                    </span>
                  )}
                  <span className="ar-body text-[13px] font-semibold leading-[1.55] line-clamp-2 text-[hsl(var(--n-text))] mt-1">
                    {p.name_ar}
                  </span>

                  <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {p.part_number && (
                      <span className="n-code text-[11px] font-bold" style={{ color: "hsl(var(--n-text))" }}>
                        {p.part_number}
                      </span>
                    )}
                    {p.erp_item_code && (
                      <span className="n-code text-[10px] text-[hsl(var(--n-text-3))]">#{p.erp_item_code}</span>
                    )}
                  </span>

                  <span className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-[5px] h-[5px] rounded-full"
                        style={{ background: "hsl(var(--n-stock-in))" }}
                        aria-hidden
                      />
                      <span className="ar-body text-[10.5px] font-bold" style={{ color: "hsl(var(--n-stock-in))" }}>
                        متوفر
                      </span>
                    </span>
                    {user ? (
                      <span className="ms-auto ar-display font-black text-[15.5px] n-num text-[hsl(var(--n-text))]">
                        {Number(p.base_price || 0).toLocaleString("ar-EG")}
                        <span className="ar-body font-bold text-[10.5px] text-[hsl(var(--n-text-3))] ms-1">ج.م</span>
                      </span>
                    ) : (
                      <span className="ms-auto ar-body text-[11.5px] font-bold" style={{ color: "hsl(var(--n-accent))" }}>
                        سجّل لرؤية السعر
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            ))}
        </div>
      </motion.section>

      {/* ══ Brand divisions ══ */}
      <motion.section {...reveal} className={`${GUTTER} mt-10`}>
        <SectionLead en="AUTHORIZED BRANDS" title="علاماتنا الرسمية" />
        <div className="mt-4" style={{ borderTop: HAIR }}>
          {BRANDS.map((b) => (
            <Link
              key={b.to}
              to={b.to}
              onClick={() => void haptic("light")}
              className="flex items-center gap-4 py-3 n-press"
              style={{ borderBottom: HAIR, minHeight: 44 }}
            >
              <span
                className="w-[64px] h-[32px] shrink-0 grid place-items-center"
                style={{ background: "hsl(var(--n-image-bg))", borderRadius: 4 }}
              >
                <img src={b.img} alt={b.label} loading="lazy" className="max-h-[24px] max-w-[54px] object-contain" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block ar-display font-bold text-[14.5px] text-[hsl(var(--n-text))] leading-none">
                  {b.label}
                </span>
                <span
                  className="block n-code text-[9px] tracking-[0.14em] text-[hsl(var(--n-text-3))] mt-1.5 truncate"
                  style={{ textAlign: "right" }}
                >
                  {b.en}
                </span>
              </span>
              <ChevronLeft className="w-4 h-4 shrink-0 text-[hsl(var(--n-text-3))]" />
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ══ Secondary editorial ══ */}
      <motion.section {...reveal} className={`${GUTTER} mt-10 space-y-3`}>
        {EDITORIAL.slice(1).map((b) => (
          <Link
            key={b.to}
            to={b.to}
            onClick={() => void haptic("light")}
            className="relative block overflow-hidden n-press"
            style={{ borderRadius: 10, height: 112 }}
          >
            <img src={b.img} alt="" aria-hidden loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to left, transparent 8%, hsl(30 10% 7% / 0.92) 58%)" }}
            />
            <div className="absolute inset-y-0 start-0 flex flex-col justify-center ps-4 pe-24">
              <span className="n-code text-[9px] tracking-[0.2em] text-white/45">{b.kicker}</span>
              <span className="ar-display font-bold text-[16px] text-white leading-snug mt-1.5">{b.title}</span>
              <span className="ar-body text-[11px] text-white/60 mt-1 truncate">{b.sub}</span>
            </div>
          </Link>
        ))}
      </motion.section>

      {/* ══ Maintenance bundles ══ */}
      <motion.section {...reveal} className={`${GUTTER} mt-8`}>
        <Link
          to="/parts-by-type"
          onClick={() => void haptic("light")}
          className="flex items-center gap-3.5 py-3.5 n-press"
          style={{ borderTop: HAIR, borderBottom: HAIR }}
        >
          <Wrench className="w-[18px] h-[18px] shrink-0" style={{ color: "hsl(var(--n-accent))" }} aria-hidden />
          <span className="flex-1 min-w-0">
            <span className="block ar-display font-bold text-[14.5px] text-[hsl(var(--n-text))]">
              باقات الصيانة الدورية
            </span>
            <span className="block ar-body text-[11.5px] text-[hsl(var(--n-text-2))] mt-1">
              كل قطع صيانة ١٠ / ٢٠ / ٤٠ ألف كم في طلب واحد
            </span>
          </span>
          <ChevronLeft className="w-4 h-4 shrink-0 text-[hsl(var(--n-text-3))]" />
        </Link>
      </motion.section>

      {/* ══ Trade access — retail-facing only ══ */}
      {!isDealer && (
        <motion.section {...reveal} className={`${GUTTER} mt-8`}>
          <div className="n-ink overflow-hidden" style={{ borderRadius: 12 }}>
            <div className="px-4 pt-4 pb-3.5">
              <span className="n-code text-[9px] tracking-[0.2em]" style={{ color: "hsl(var(--n-gold))" }}>
                TRADE ACCOUNTS
              </span>
              <p className="ar-display font-bold text-[16.5px] text-white mt-2">بوابة الجملة للتجّار</p>
              <p className="ar-body text-[12px] leading-[1.75] text-white/55 mt-1.5">
                أسعار الجملة، طلبات متكررة، وكشف حساب — من حساب تاجر معتمد.
              </p>
            </div>
            <div className="grid grid-cols-2" style={{ borderTop: HAIR_LIGHT }}>
              {DEALER_LINKS.map((d, i) => (
                <Link
                  key={d.to}
                  to={d.to}
                  onClick={() => void haptic("light")}
                  className="h-[52px] flex items-center justify-center gap-2 n-press"
                  style={i === 0 ? { borderInlineEnd: HAIR_LIGHT } : undefined}
                >
                  <d.icon className="w-[16px] h-[16px] text-white/60" aria-hidden />
                  <span className="ar-body text-[13px] font-bold text-white">{d.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ══ Guest access ══ */}
      {!user && (
        <motion.section {...reveal} className={`${GUTTER} mt-4`}>
          <Link
            to="/auth"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-[50px] n-press"
            style={{ background: "hsl(var(--n-accent))", borderRadius: 10 }}
          >
            <span className="ar-display font-bold text-[14.5px] text-white">أنشئ حساب وشوف الأسعار</span>
          </Link>
        </motion.section>
      )}

      {/* ══ Record line ══ */}
      <section className={`${GUTTER} mt-9`}>
        <div className="flex items-stretch" style={{ borderTop: HAIR, borderBottom: HAIR }}>
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="flex-1 py-4 text-center"
              style={i > 0 ? { borderInlineEnd: HAIR } : undefined}
            >
              <p className="ar-display font-black text-[19px] leading-none n-num text-[hsl(var(--n-text))]">
                {s.value}
              </p>
              <p className="ar-body text-[10.5px] text-[hsl(var(--n-text-3))] mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ Services ══ */}
      <motion.section {...reveal} className={`${GUTTER} mt-9`}>
        <SectionLead en="SERVICES" title="الخدمات" />
        <div className="mt-3.5" style={{ borderTop: HAIR }}>
          {SERVICES.map((s) => (
            <HairRow key={s.to} {...s} />
          ))}
        </div>
      </motion.section>

      {/* ══ Guides ══ */}
      <motion.section {...reveal} className={`${GUTTER} mt-9`}>
        <SectionLead en="TECHNICAL GUIDES" title="أدلة ونصائح فنية" />
        <div className="mt-3.5" style={{ borderTop: HAIR }}>
          {GUIDES.map((g, i) => (
            <Link
              key={g.to}
              to={g.to}
              onClick={() => void haptic("light")}
              className="flex items-center gap-3 py-3.5 n-press"
              style={{ borderBottom: HAIR, minHeight: 44 }}
            >
              <span className="n-code text-[10px] w-6 shrink-0 text-[hsl(var(--n-text-3))]">{idx(i)}</span>
              <span className="flex-1 ar-body text-[13.5px] font-semibold leading-snug text-[hsl(var(--n-text))]">
                {g.label}
              </span>
              <ChevronLeft className="w-4 h-4 shrink-0 text-[hsl(var(--n-text-3))]" />
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ══ Company ══ */}
      <motion.section {...reveal} className={`${GUTTER} mt-9`}>
        <SectionLead en="COMPANY" title="المصرية جروب" />
        <div className="mt-3.5" style={{ borderTop: HAIR }}>
          {ABOUT_LINKS.map((a) => (
            <HairRow key={a.to} {...a} />
          ))}
        </div>
      </motion.section>

      {/* ══ Contact ══ */}
      <section className={`${GUTTER} mt-6`}>
        <div className="grid grid-cols-2" style={{ borderTop: HAIR, borderBottom: HAIR }}>
          <a
            href="https://wa.me/201034806288"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-[52px] n-press"
            style={{ borderInlineEnd: HAIR }}
          >
            <MessageCircle className="w-[17px] h-[17px] text-[#1DA851]" aria-hidden />
            <span className="ar-body text-[13px] font-bold text-[hsl(var(--n-text))]">واتساب</span>
          </a>
          <a
            href="tel:+201034806288"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-[52px] n-press"
          >
            <Phone className="w-[17px] h-[17px]" style={{ color: "hsl(var(--n-accent))" }} aria-hidden />
            <span className="ar-body text-[13px] font-bold text-[hsl(var(--n-text))]">اتصل بنا</span>
          </a>
        </div>
      </section>

      {/* ══ Colophon ══ */}
      <footer className={`${GUTTER} mt-8 pb-2`}>
        <div className="pt-1 flex items-center gap-3">
          <span className="px-2.5 py-1.5 n-ink" style={{ borderRadius: 6 }}>
            <img src={logoDark} alt="المصرية جروب" className="h-[18px] w-auto object-contain" />
          </span>
          <p className="ar-body text-[11px] leading-[1.7] text-[hsl(var(--n-text-3))]">
            موزّع معتمد لقطع غيار تويوتا
            <br />
            المصرية جروب — منذ ١٩٩٩
          </p>
        </div>
      </footer>

      <div className="h-4" />
    </div>
  );
};

export default NativeHomeScreen;
