import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Truck,
  Headphones,
  ChevronLeft,
  Filter as FilterIcon,
  Droplets,
  Disc,
  Zap,
  Cog,
  Wind,
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
import logoAsset from "@/assets/almasria-logo-dark.png.asset.json";
import catEngine from "@/assets/cat-engine.jpg";
import catFilters from "@/assets/cat-filters.jpg";
import catOils from "@/assets/cat-oils.jpg";
import catElectrical from "@/assets/cat-electrical.jpg";
import catSuspension from "@/assets/cat-suspension.jpg";
import catCooling from "@/assets/cat-cooling.jpg";


/* ────────────────────────────────────────────────────────────
   Native app home — a real mobile app surface, not a webpage.
   Rendered only inside the iOS/Android shell.
   ──────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { slug: "filters", label: "فلاتر", img: catFilters, icon: FilterIcon },
  { slug: "oils-gasoline", label: "زيوت", img: catOils, icon: Droplets },
  { slug: "brakes", label: "فرامل", img: catEngine, icon: Disc },
  { slug: "electrical", label: "كهرباء", img: catElectrical, icon: Zap },
  { slug: "belts-bearings", label: "سيور", img: catSuspension, icon: Cog },
  { slug: "water-cooling", label: "تبريد", img: catCooling, icon: Wind },
];

const BANNERS = [
  {
    title: "قطع غيار تويوتا الأصلية",
    sub: "ضمان وكالة 100% — من الموزع المعتمد",
    cta: "تصفّح الآن",
    to: "/products/genuine-toyota-parts",
    from: "hsl(353 92% 30%)",
    to2: "hsl(0 0% 6%)",
  },
  {
    title: "زيوت تويوتا الأصلية",
    sub: "حماية أطول للمحرك — بأسعار الجملة",
    cta: "اطلب زيتك",
    to: "/products?category=oils-gasoline",
    from: "hsl(210 60% 25%)",
    to2: "hsl(0 0% 6%)",
  },
  {
    title: "MTX — البديل الاقتصادي",
    sub: "جودة معتمدة وسعر مناسب",
    cta: "اكتشف MTX",
    to: "/mtx",
    from: "hsl(44 53% 30%)",
    to2: "hsl(0 0% 6%)",
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


const NativeHomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [banner, setBanner] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setBanner((b) => (b + 1) % BANNERS.length), 5000);
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
    <div dir="rtl" className="min-h-screen bg-carbon text-white">
      {/* ── App header ── */}
      <header
        className="sticky top-0 z-40 bg-carbon/90 backdrop-blur-xl border-b border-white/[0.07]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <img src={logoAsset.url} alt="المصرية جروب" className="h-9 w-auto object-contain" />
            <Link
              to={user ? "/my-profile" : "/auth"}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 grid place-items-center active:scale-95 transition-transform"
              aria-label="التنبيهات"
            >
              <Bell className="w-[18px] h-[18px] text-soft" />
            </Link>
          </div>

          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 h-11 px-3.5 rounded-2xl bg-white/[0.06] border border-white/10 focus-within:border-toyota-red/60 transition-colors">
              <Search className="w-[18px] h-[18px] text-soft shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بكود الصنف أو البارت نمبر…"
                className="flex-1 bg-transparent outline-none font-tajawal text-sm text-white placeholder:text-soft"
                inputMode="search"
              />
            </div>
            <button
              type="button"
              onClick={() => navigate("/products")}
              aria-label="مسح ضوئي"
              className="w-11 h-11 rounded-2xl bg-toyota-red grid place-items-center active:scale-95 transition-transform"
            >
              <ScanLine className="w-5 h-5 text-white" />
            </button>
          </form>
        </div>
      </header>

      {/* ── Banner carousel ── */}
      <section className="pt-4">
        <div
          ref={bannerRef}
          className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {BANNERS.map((b, i) => (
            <Link
              key={b.title}
              to={b.to}
              className="snap-start shrink-0 w-[86%] rounded-3xl overflow-hidden relative active:scale-[0.98] transition-transform"
              style={{
                background: `linear-gradient(135deg, ${b.from} 0%, ${b.to2} 100%)`,
              }}
            >
              <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-white/[0.06]" />
              <div className="relative p-5 min-h-[148px] flex flex-col justify-between">
                <div>
                  <h2 className="font-tajawal font-black text-xl leading-snug">{b.title}</h2>
                  <p className="font-tajawal text-sm text-white/70 mt-1.5">{b.sub}</p>
                </div>
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
      <section className="px-4 mt-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, label: "ضمان أصالة" },
            { icon: Truck, label: "توصيل 48 ساعة" },
            { icon: Headphones, label: "دعم فني" },
          ].map((t) => (
            <div
              key={t.label}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-surface border border-white/[0.06]"
            >
              <t.icon className="w-[18px] h-[18px] text-gold" />
              <span className="font-tajawal text-[11px] text-soft">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="mt-7">
        <SectionHeader title="تسوّق حسب الفئة" to="/products" />
        <div className="grid grid-cols-3 gap-3 px-4 mt-3">
          {CATEGORIES.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <Link
                to={`/products?category=${c.slug}`}
                className="block rounded-2xl overflow-hidden bg-surface border border-white/[0.06] active:scale-95 transition-transform"
              >
                <div className="relative h-16 overflow-hidden">
                  <img src={c.img} alt={c.label} className="w-full h-full object-cover opacity-55" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                  <c.icon className="absolute inset-0 m-auto w-6 h-6 text-toyota-red drop-shadow" />
                </div>
                <div className="py-2 text-center font-tajawal font-bold text-xs">{c.label}</div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── كل الخدمات ── */}
      <section className="px-4 mt-7">
        <h2 className="font-tajawal font-black text-base mb-3">كل الخدمات</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {SERVICES.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-surface border border-white/[0.06] active:scale-95 transition-transform"
            >
              <span className="w-9 h-9 rounded-xl bg-toyota-red/[0.12] grid place-items-center">
                <s.icon className="w-[18px] h-[18px] text-toyota-red" />
              </span>
              <span className="font-tajawal text-[10.5px] text-center leading-tight px-1">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── حسب موديل السيارة ── */}
      <section className="mt-7">
        <SectionHeader title="اختر موديل عربيتك" to="/parts-by-model" />
        <div className="flex gap-2 overflow-x-auto px-4 mt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MODELS.map((m) => (
            <Link
              key={m.slug}
              to={`/parts-by-model/${m.slug}`}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-surface border border-white/10 font-tajawal text-xs font-bold active:scale-95 transition-transform"
            >
              <Car className="w-4 h-4 text-gold" />
              {m.label}
            </Link>
          ))}
        </div>
      </section>



      {/* ── Products rail ── */}
      <section className="mt-7">
        <SectionHeader title="وصل حديثاً" to="/products" />
        <div className="flex gap-3 overflow-x-auto px-4 mt-3 pb-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[46%] h-56 rounded-2xl bg-surface animate-pulse" />
            ))}

          {!isLoading &&
            products.map((p: any) => (
              <Link
                key={p.id}
                to={`/products?search=${encodeURIComponent(p.sku || p.name_ar)}`}
                className="snap-start shrink-0 w-[46%] rounded-2xl bg-surface border border-white/[0.06] overflow-hidden active:scale-[0.97] transition-transform"
              >
                <div className="aspect-square bg-white p-2">
                  <LazyImage
                    src={p.image_url}
                    alt={p.name_ar}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-2.5 space-y-1">
                  {p.erp_item_code && (
                    <p className="font-tajawal text-[10px] text-gold leading-none">كود: {p.erp_item_code}</p>
                  )}
                  {p.part_number && (
                    <p className="font-mono text-[10px] text-soft leading-none truncate">{p.part_number}</p>
                  )}
                  <p className="font-tajawal text-xs font-bold leading-snug line-clamp-2 min-h-[2rem]">
                    {p.name_ar}
                  </p>
                  {user ? (
                    <p className="font-tajawal text-sm font-black text-toyota-red">
                      {Number(p.base_price || 0).toLocaleString("ar-EG")} ج.م
                    </p>
                  ) : (
                    <p className="font-tajawal text-[11px] text-soft">سجّل لرؤية السعر</p>
                  )}
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* ── Guest CTA ── */}
      {!user && (
        <section className="px-4 mt-6">
          <div className="rounded-3xl p-5 bg-gradient-to-br from-toyota-red/25 to-surface border border-toyota-red/25">
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
                className="flex-1 text-center py-3 rounded-2xl bg-white/[0.07] border border-white/10 font-tajawal font-bold text-sm active:scale-95 transition-transform"
              >
                دخول التجار
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── باقات الصيانة ── */}
      <section className="px-4 mt-7">
        <Link
          to="/parts-by-type"
          className="block rounded-3xl p-5 bg-surface border border-white/[0.07] active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-gold/15 grid place-items-center shrink-0">
              <Wrench className="w-5 h-5 text-gold" />
            </span>
            <div className="flex-1">
              <h3 className="font-tajawal font-black text-base">باقات الصيانة الدورية</h3>
              <p className="font-tajawal text-xs text-soft mt-1">
                كل قطع صيانة 10/20/40 ألف كم في طلب واحد
              </p>
            </div>
            <ChevronLeft className="w-5 h-5 text-soft" />
          </div>
        </Link>
      </section>

      {/* ── الأدلة الفنية ── */}
      <section className="mt-7">
        <h2 className="font-tajawal font-black text-base px-4 mb-3">أدلة ونصائح فنية</h2>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GUIDES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              className="snap-start shrink-0 w-[62%] rounded-2xl p-4 bg-surface border border-white/[0.06] active:scale-[0.97] transition-transform"
            >
              <BookOpen className="w-5 h-5 text-toyota-red mb-3" />
              <p className="font-tajawal font-bold text-sm leading-snug">{g.label}</p>
              <span className="font-tajawal text-[11px] text-soft mt-2 inline-block">اقرأ الدليل</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── الشركة ── */}
      <section className="px-4 mt-7">
        <h2 className="font-tajawal font-black text-base mb-3">المصرية جروب</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {ABOUT_LINKS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-surface border border-white/[0.06] active:scale-95 transition-transform"
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
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.06] border border-white/10 active:scale-95 transition-transform"
          >
            <Phone className="w-[18px] h-[18px] text-white" />
            <span className="font-tajawal text-xs font-bold">اتصل بنا</span>
          </a>
        </div>
      </section>

      {/* ── ختام ── */}
      <footer className="px-4 mt-8 pb-2 flex flex-col items-center gap-2">
        <img src={logoAsset.url} alt="المصرية جروب" className="h-8 w-auto object-contain opacity-80" />
        <p className="font-tajawal text-[11px] text-soft text-center">
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
