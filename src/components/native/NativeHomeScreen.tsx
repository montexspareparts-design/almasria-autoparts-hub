import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Truck,
  Headphones,
  ChevronLeft,
  Bell,
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { LazyImage } from "@/components/ui/lazy-image";
import logoDark from "@/assets/almasria-logo-dark.png";

import heroAmbient from "@/assets/native/hero-ambient.jpg";
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
   Native app home — editorial, image-led, premium.
   Rendered only inside the iOS/Android shell.
   ──────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { slug: "filters", label: "فلاتر", sub: "زيت • هواء • مكيف", img: catFilters },
  { slug: "oils-gasoline", label: "زيوت", sub: "محرك • فتيس", img: catOils },
  { slug: "brakes", label: "فرامل", sub: "تيل • هوبات", img: catBrakes },
  { slug: "electrical", label: "كهرباء", sub: "بوجيهات • دينمو", img: catElectrical },
  { slug: "belts-bearings", label: "سيور", sub: "كاويتش • رمان", img: catBelts },
  { slug: "water-cooling", label: "تبريد", sub: "رادياتير • طلمبة", img: catCooling },
];

const BANNERS = [
  {
    kicker: "موزع معتمد",
    title: "قطع غيار تويوتا الأصلية",
    sub: "ضمان وكالة 100% — من المصدر مباشرة",
    cta: "تصفّح الآن",
    to: "/products/genuine-toyota-parts",
    img: bannerGenuine,
    tint: "hsl(353 92% 22%)",
  },
  {
    kicker: "حماية المحرك",
    title: "زيوت تويوتا الأصلية",
    sub: "كل درجات اللزوجة — بأسعار الجملة",
    cta: "اطلب زيتك",
    to: "/products?category=oils-gasoline",
    img: bannerOils,
    tint: "hsl(210 70% 18%)",
  },
  {
    kicker: "علامتنا المسجّلة",
    title: "MTX — البديل الاقتصادي",
    sub: "جودة معتمدة وسعر مناسب",
    cta: "اكتشف MTX",
    to: "/mtx",
    img: bannerMtx,
    tint: "hsl(44 60% 18%)",
  },
];

/* كل خدمات الموقع — لا شيء ناقص داخل التطبيق */
const SERVICES = [
  { label: "قطع أصلية", to: "/products/genuine-toyota-parts", icon: BadgeCheck },
  { label: "MTX", to: "/mtx", icon: Sparkles },
  { label: "حسب الموديل", to: "/parts-by-model", icon: Car },
  { label: "حسب النوع", to: "/parts-by-type", icon: Wrench },
  { label: "الكتالوجات", to: "/catalogs", icon: BookOpen },
  { label: "تتبع الطلب", to: "/track-order", icon: PackageSearch },
  { label: "دخول التجار", to: "/dealer-login", icon: Store },
  { label: "تسجيل تاجر", to: "/dealer-apply", icon: Building2 },
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
  { label: "عن الشركة", to: "/about", icon: Info },
  { label: "ليه المصرية؟", to: "/what-sets-us-apart", icon: BadgeCheck },
  { label: "فروعنا", to: "/contact", icon: MapPin },
  { label: "السياسات", to: "/policies", icon: ScrollText },
];

const STATS = [
  { value: "+25", label: "سنة خبرة" },
  { value: "+20000", label: "صنف متاح" },
  { value: "48h", label: "توصيل" },
];

const NativeHomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [banner, setBanner] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setBanner((b) => (b + 1) % BANNERS.length), 5500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const child = el.children[banner] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, [banner]);

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
    if (!query.trim()) return navigate("/products");
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-carbon text-white overflow-x-hidden">
      {/* ── Cinematic header ── */}
      <header className="relative">
        <div className="absolute inset-0">
          <img
            src={heroAmbient}
            alt=""
            aria-hidden
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-carbon/70 via-carbon/80 to-carbon" />
        </div>

        <div
          className="relative px-4 pb-6"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <img src={logoDark} alt="المصرية جروب" className="h-10 w-auto object-contain" />
            <Link
              to={user ? "/my-profile" : "/auth"}
              className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-xl grid place-items-center active:scale-95 transition-transform"
              aria-label="حسابي"
            >
              <Bell className="w-[18px] h-[18px] text-white/80" />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-7"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-toyota-red/15 border border-toyota-red/30 font-tajawal text-[10.5px] font-bold text-toyota-red">
              <ShieldCheck className="w-3 h-3" />
              موزّع معتمد منذ 1999
            </span>
            <h1 className="font-tajawal font-black text-[26px] leading-[1.25] mt-3">
              قطع غيار تويوتا الأصلية
              <span className="block text-white/55 text-[17px] font-bold mt-1">
                توصيل خلال 48 ساعة لكل المحافظات
              </span>
            </h1>
          </motion.div>

          <form onSubmit={submitSearch} className="flex items-center gap-2 mt-5">
            <div className="flex-1 flex items-center gap-2 h-12 px-4 rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-xl focus-within:border-toyota-red/70 transition-colors">
              <button type="submit" aria-label="بحث" className="shrink-0">
                <Search className="w-[18px] h-[18px] text-white/60" />
              </button>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بكود الصنف أو البارت نمبر…"
                className="flex-1 bg-transparent outline-none font-tajawal text-sm text-white placeholder:text-white/40"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
              />
              {query.trim() && (
                <button
                  type="submit"
                  className="shrink-0 px-3 h-8 rounded-xl bg-toyota-red font-tajawal text-[12px] font-bold text-white active:scale-95 transition-transform"
                >
                  بحث
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate("/products")}
              aria-label="مسح ضوئي"
              className="w-12 h-12 rounded-2xl bg-toyota-red grid place-items-center active:scale-95 transition-transform shadow-[0_10px_30px_-10px_hsl(353_92%_45%/0.8)]"
            >
              <ScanLine className="w-5 h-5 text-white" />
            </button>
          </form>


          {/* stats */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl py-3 text-center bg-white/[0.05] border border-white/10 backdrop-blur-xl"
              >
                <p className="font-tajawal font-black text-lg text-gold leading-none">{s.value}</p>
                <p className="font-tajawal text-[10.5px] text-white/55 mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Editorial banner carousel ── */}
      <section className="pt-6">
        <div
          ref={bannerRef}
          className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {BANNERS.map((b) => (
            <Link
              key={b.title}
              to={b.to}
              className="snap-center shrink-0 w-[88%] rounded-[28px] overflow-hidden relative active:scale-[0.98] transition-transform border border-white/[0.08]"
            >
              <img
                src={b.img}
                alt={b.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(100deg, ${b.tint} 8%, hsl(0 0% 4% / 0.85) 45%, transparent 100%)`,
                }}
              />
              <div className="relative p-5 min-h-[190px] flex flex-col justify-end">
                <span className="font-tajawal text-[10.5px] font-bold tracking-wide text-gold">
                  {b.kicker}
                </span>
                <h2 className="font-tajawal font-black text-[21px] leading-snug mt-1">{b.title}</h2>
                <p className="font-tajawal text-[12.5px] text-white/70 mt-1.5 max-w-[85%]">{b.sub}</p>
                <span className="self-start inline-flex items-center gap-1 mt-4 px-4 py-2 rounded-full bg-white text-carbon font-tajawal font-bold text-xs">
                  {b.cta}
                  <ChevronLeft className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {BANNERS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === banner ? "w-6 bg-toyota-red" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="px-4 mt-6">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, label: "ضمان أصالة" },
            { icon: Truck, label: "توصيل 48 ساعة" },
            { icon: Headphones, label: "دعم فني" },
          ].map((t) => (
            <div
              key={t.label}
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.07]"
            >
              <t.icon className="w-[18px] h-[18px] text-gold" />
              <span className="font-tajawal text-[11px] text-white/60">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Brands rail ── */}
      <section className="mt-8">
        <SectionHeader title="ماركاتنا" to="/products" />
        <div className="flex gap-3 overflow-x-auto px-4 mt-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BRANDS.map((b) => (
            <Link
              key={b.to}
              to={b.to}
              className="shrink-0 w-[110px] rounded-2xl bg-white p-3 active:scale-95 transition-transform"
            >
              <div className="h-12 grid place-items-center">
                <img src={b.img} alt={b.label} loading="lazy" className="max-h-11 w-auto object-contain" />
              </div>
              <p className="font-tajawal text-[10.5px] font-bold text-carbon text-center mt-2 leading-tight">
                {b.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Categories (editorial tiles) ── */}
      <section className="mt-8">
        <SectionHeader title="تسوّق حسب الفئة" to="/products" />
        <div className="grid grid-cols-2 gap-3 px-4 mt-3">
          {CATEGORIES.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 2) * 0.06, duration: 0.35 }}
            >
              <Link
                to={`/products?category=${c.slug}`}
                className="block relative rounded-[22px] overflow-hidden border border-white/[0.08] active:scale-[0.97] transition-transform"
              >
                <div className="relative h-[112px]">
                  <img
                    src={c.img}
                    alt={c.label}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/45 to-transparent" />
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3">
                  <p className="font-tajawal font-black text-sm leading-none">{c.label}</p>
                  <p className="font-tajawal text-[10px] text-white/55 mt-1">{c.sub}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── كل الخدمات ── */}
      <section className="px-4 mt-8">
        <h2 className="font-tajawal font-black text-base mb-3">كل الخدمات</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {SERVICES.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.07] active:scale-95 transition-transform"
            >
              <span className="w-10 h-10 rounded-xl bg-toyota-red/[0.14] grid place-items-center">
                <s.icon className="w-[18px] h-[18px] text-toyota-red" />
              </span>
              <span className="font-tajawal text-[10.5px] text-center leading-tight px-1 text-white/85">
                {s.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── حسب موديل السيارة ── */}
      <section className="mt-8">
        <SectionHeader title="اختر موديل عربيتك" to="/parts-by-model" />
        <div className="flex gap-2 overflow-x-auto px-4 mt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MODELS.map((m) => (
            <Link
              key={m.slug}
              to={`/parts-by-model/${m.slug}`}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-white/[0.05] border border-white/12 font-tajawal text-xs font-bold active:scale-95 transition-transform"
            >
              <Car className="w-4 h-4 text-gold" />
              {m.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Products rail ── */}
      <section className="mt-8">
        <SectionHeader title="وصل حديثاً" to="/products" />
        <div className="flex gap-3 overflow-x-auto px-4 mt-3 pb-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[46%] h-56 rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}

          {!isLoading &&
            products.map((p: any) => (
              <Link
                key={p.id}
                to={`/products?search=${encodeURIComponent(p.sku || p.name_ar)}`}
                className="snap-start shrink-0 w-[46%] rounded-[20px] bg-white/[0.035] border border-white/[0.07] overflow-hidden active:scale-[0.97] transition-transform"
              >
                <div className="aspect-square bg-white p-2.5">
                  <LazyImage src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain" />
                </div>
                <div className="p-2.5 space-y-1">
                  {p.erp_item_code && (
                    <p className="font-tajawal text-[10px] text-gold leading-none">كود: {p.erp_item_code}</p>
                  )}
                  {p.part_number && (
                    <p className="font-mono text-[10px] text-white/45 leading-none truncate">{p.part_number}</p>
                  )}
                  <p className="font-tajawal text-xs font-bold leading-snug line-clamp-2 min-h-[2rem]">
                    {p.name_ar}
                  </p>
                  {user ? (
                    <p className="font-tajawal text-sm font-black text-toyota-red">
                      {Number(p.base_price || 0).toLocaleString("ar-EG")} ج.م
                    </p>
                  ) : (
                    <p className="font-tajawal text-[11px] text-white/50">سجّل لرؤية السعر</p>
                  )}
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* ── Guest CTA ── */}
      {!user && (
        <section className="px-4 mt-7">
          <div className="relative rounded-[28px] overflow-hidden border border-toyota-red/25">
            <img src={bannerGenuine} alt="" aria-hidden loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-l from-toyota-red/35 via-carbon/90 to-carbon" />
            <div className="relative p-5">
              <h3 className="font-tajawal font-black text-lg">اعرف أسعارك الخاصة</h3>
              <p className="font-tajawal text-sm text-white/70 mt-1.5">
                سجّل حسابك دلوقتي وشوف الأسعار والعروض المخصصة ليك.
              </p>
              <div className="flex gap-2 mt-4">
                <Link
                  to="/auth"
                  className="flex-1 text-center py-3 rounded-2xl bg-toyota-red font-tajawal font-bold text-sm active:scale-95 transition-transform"
                >
                  إنشاء حساب
                </Link>
                <Link
                  to="/dealer-login"
                  className="flex-1 text-center py-3 rounded-2xl bg-white/[0.08] border border-white/15 font-tajawal font-bold text-sm active:scale-95 transition-transform"
                >
                  دخول التجار
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── باقات الصيانة ── */}
      <section className="px-4 mt-7">
        <Link
          to="/parts-by-type"
          className="block rounded-[24px] p-5 bg-white/[0.035] border border-white/[0.08] active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-gold/15 grid place-items-center shrink-0">
              <Wrench className="w-5 h-5 text-gold" />
            </span>
            <div className="flex-1">
              <h3 className="font-tajawal font-black text-base">باقات الصيانة الدورية</h3>
              <p className="font-tajawal text-xs text-white/55 mt-1">
                كل قطع صيانة 10/20/40 ألف كم في طلب واحد
              </p>
            </div>
            <ChevronLeft className="w-5 h-5 text-white/40" />
          </div>
        </Link>
      </section>

      {/* ── الأدلة الفنية ── */}
      <section className="mt-8">
        <h2 className="font-tajawal font-black text-base px-4 mb-3">أدلة ونصائح فنية</h2>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GUIDES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              className="snap-start shrink-0 w-[62%] rounded-[20px] p-4 bg-white/[0.035] border border-white/[0.07] active:scale-[0.97] transition-transform"
            >
              <BookOpen className="w-5 h-5 text-toyota-red mb-3" />
              <p className="font-tajawal font-bold text-sm leading-snug">{g.label}</p>
              <span className="font-tajawal text-[11px] text-white/45 mt-2 inline-block">اقرأ الدليل</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── الشركة ── */}
      <section className="px-4 mt-8">
        <h2 className="font-tajawal font-black text-base mb-3">المصرية جروب</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {ABOUT_LINKS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-2.5 px-3.5 py-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.07] active:scale-95 transition-transform"
            >
              <a.icon className="w-[18px] h-[18px] text-gold shrink-0" />
              <span className="font-tajawal text-xs font-bold">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── تواصل ── */}
      <section className="px-4 mt-5">
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href="https://wa.me/201034806288"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 active:scale-95 transition-transform"
          >
            <MessageCircle className="w-[18px] h-[18px] text-[#25D366]" />
            <span className="font-tajawal text-xs font-bold text-[#25D366]">واتساب</span>
          </a>
          <a
            href="tel:+201034806288"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.06] border border-white/12 active:scale-95 transition-transform"
          >
            <Phone className="w-[18px] h-[18px] text-white" />
            <span className="font-tajawal text-xs font-bold">اتصل بنا</span>
          </a>
        </div>
      </section>

      {/* ── ختام ── */}
      <footer className="px-4 mt-9 pb-2 flex flex-col items-center gap-2">
        <img src={logoDark} alt="المصرية جروب" className="h-8 w-auto object-contain opacity-80" />
        <p className="font-tajawal text-[11px] text-white/45 text-center">
          موزع معتمد لقطع غيار تويوتا — منذ 1999
        </p>
      </footer>

      <div className="h-6" />
    </div>
  );
};

const SectionHeader = ({ title, to }: { title: string; to: string }) => (
  <div className="flex items-center justify-between px-4">
    <h2 className="font-tajawal font-black text-base">{title}</h2>
    <Link to={to} className="font-tajawal text-xs text-toyota-red font-bold inline-flex items-center gap-0.5">
      عرض الكل
      <ChevronLeft className="w-3.5 h-3.5" />
    </Link>
  </div>
);

export default NativeHomeScreen;
