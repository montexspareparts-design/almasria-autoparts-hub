import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Camera,
  ChevronLeft,
  ShoppingBag,
  User,
  Car,
  Wrench,
  PackageSearch,
  BookOpen,
  Store,
  Building2,
  BadgeCheck,
  MapPin,
  ScrollText,
  Info,
  Sparkles,
  Phone,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import ImageSearchDialog from "@/components/ImageSearchDialog";
import { haptic } from "@/lib/haptics";
import logoDark from "@/assets/almasria-logo-dark.png";

import NativeSignatureHero from "@/components/native/NativeSignatureHero";
import FitPartCard from "@/components/native/FitPartCard";
import { useGarage } from "@/contexts/GarageContext";
import { useFitmentProducts } from "@/hooks/useFitmentProducts";

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
   Native home — "Precision Dark".
   Fitment-first: header → search → garage → quick actions →
   parts that fit → catalogue. Marketing lives on /about.
   Two horizontal rails max, CSS-only motion, no backdrop blur.
   ──────────────────────────────────────────────────────────── */

const GUTTER = "px-4";

const QUICK_ACTIONS = [
  { label: "حسب الموديل", to: "/products", icon: Car },
  { label: "حسب النوع", to: "/parts-by-type", icon: Wrench },
  { label: "تتبّع الطلب", to: "/track-order", icon: PackageSearch },
  { label: "الكتالوجات", to: "/catalogs", icon: BookOpen },
];

const CATEGORIES = [
  { slug: "filters", label: "فلاتر", img: catFilters },
  { slug: "oils-gasoline", label: "زيوت", img: catOils },
  { slug: "brakes", label: "فرامل", img: catBrakes },
  { slug: "electrical", label: "كهرباء", img: catElectrical },
  { slug: "belts-bearings", label: "سيور", img: catBelts },
  { slug: "water-cooling", label: "تبريد", img: catCooling },
];

const BRANDS = [
  { label: "تويوتا الأصلية", img: brandGenuine, to: "/products/toyota-genuine" },
  { label: "زيوت تويوتا", img: brandOil, to: "/products/toyota-oils" },
  { label: "MTX", img: brandMtxLogo, to: "/products/mtx-aftermarket" },
  { label: "DENSO", img: brandDenso, to: "/products/denso" },
  { label: "AISIN", img: brandAisin, to: "/products/aisin" },
  { label: "FBK", img: brandFbk, to: "/products/fbk-brakes" },
];

const SERVICES = [
  { label: "قطع تويوتا الأصلية", hint: "موزّع معتمد", to: "/products/genuine-toyota-parts", icon: BadgeCheck },
  { label: "علامة MTX", hint: "بديل اقتصادي معتمد", to: "/mtx", icon: Sparkles },
  { label: "باقات الصيانة الدورية", hint: "10 / 20 / 40 ألف كم", to: "/parts-by-type", icon: Wrench },
];

const DEALER_LINKS = [
  { label: "دخول التجّار", hint: "بوابة الجملة B2B", to: "/dealer-login", icon: Store },
  { label: "تسجيل تاجر جديد", hint: "افتح حساب جملة", to: "/dealer-apply", icon: Building2 },
];

const ABOUT_LINKS = [
  { label: "عن الشركة", hint: "قصة المصرية جروب", to: "/about", icon: Info },
  { label: "فروعنا والتواصل", hint: "القاهرة والمحافظات", to: "/contact", icon: MapPin },
  { label: "السياسات", hint: "الشحن • الاسترجاع • الخصوصية", to: "/policies", icon: ScrollText },
];

const NativeHomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { activeVehicle } = useGarage();
  const { products: fitProducts, isLoading: fitLoading } = useFitmentProducts(6);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["native_home_products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, name_ar, sku, erp_item_code, part_number, image_url, base_price, brand, stock_quantity, min_order_qty",
        )
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .not("image_url", "ilike", "%/brands/%")
        .order("created_at", { ascending: false })
        .limit(6);
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
    <div dir="rtl" className="pd-root min-h-screen text-white overflow-x-hidden">
      {/* one ambient gold light source behind everything */}
      <div className="pd-aura" aria-hidden />

      <div className="pd-layer">
      {/* ───────────── Sticky header + search ───────────── */}
      <header
        className={`sticky top-0 z-40 pd-s1 pd-hair-b pd-head ${scrolled ? "pd-head-solid" : ""}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className={`h-[52px] ${GUTTER} flex items-center justify-between gap-3`}>
          <img src={logoDark} alt="المصرية جروب" className="h-7 w-auto object-contain" />
          <div className="flex items-center shrink-0">
            <Link
              to="/cart"
              aria-label="السلة"
              onClick={() => void haptic("light")}
              className="relative pd-tap rounded-full grid place-items-center ios-press"
            >
              <ShoppingBag className="w-[19px] h-[19px] text-white/80" />
              {itemCount > 0 && (
                <span className="absolute top-1 left-1 min-w-[17px] h-[17px] px-1 rounded-full bg-gold text-black text-[10px] font-semibold grid place-items-center pd-mono">
                  {itemCount > 99 ? "99" : itemCount}
                </span>
              )}
            </Link>
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="pd-tap rounded-full grid place-items-center ios-press"
            >
              <User className="w-[19px] h-[19px] text-white/80" />
            </Link>
          </div>
        </div>

        <div className={`${GUTTER} pb-3`}>
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 h-11 px-3 rounded-[12px] pd-s2 pd-hair">
              <Search className="w-[17px] h-[17px] text-white/40 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="كود الصنف أو البارت نمبر"
                className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-white placeholder:text-white/35"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label="بحث في الكتالوج"
              />
            </div>
            <ImageSearchDialog
              onProductFound={(term) => navigate(`/products?search=${encodeURIComponent(term)}`)}
              trigger={
                <button
                  type="button"
                  onClick={() => void haptic("medium")}
                  aria-label="بحث بصورة القطعة"
                  className="w-11 h-11 rounded-[12px] pd-s3 pd-hair grid place-items-center ios-press shrink-0"
                >
                  <Camera className="w-[19px] h-[19px] text-gold" />
                </button>
              }
            />
          </form>
        </div>
        <div className={`pd-edge-t transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`} />
      </header>

      {/* ───────────── Signature hero / garage ───────────── */}
      <section className={`${GUTTER} pt-4 pd-reveal`}>
        <NativeSignatureHero />
      </section>

      {/* ───────────── Quick actions ───────────── */}
      <section className={`${GUTTER} mt-3 pd-reveal`} style={{ "--d": "40ms" } as React.CSSProperties}>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((a, i) => (
            <Link
              key={a.to}
              to={a.to}
              onClick={() => void haptic("light")}
              className="pd-card h-[78px] flex flex-col items-center justify-center gap-1.5 ios-press relative overflow-hidden"
            >
              <span className="absolute top-0 inset-x-3 h-px bg-gradient-to-l from-transparent via-gold/30 to-transparent" />
              <span className="w-8 h-8 rounded-[10px] bg-gold/[0.09] border border-gold/15 grid place-items-center">
                <a.icon className="w-[17px] h-[17px] text-gold" />
              </span>
              <span className="text-[10.5px] text-white/70 leading-none text-center px-1">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────────── Fits your car (2-col grid) ───────────── */}
      {activeVehicle && (
        <section className="mt-8 pd-reveal" style={{ "--d": "60ms" } as React.CSSProperties}>
          <SectionHeader
            title={`يركّب على ${activeVehicle.displayName}`}
            kicker="EXACT FITMENT"
            to={`/products?search=${encodeURIComponent(activeVehicle.model)}`}
          />
          <div className={`${GUTTER} mt-3 grid grid-cols-2 gap-3`}>
            {fitLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[268px] rounded-[16px] pd-skeleton" />
              ))}
            {!fitLoading && fitProducts.length === 0 && (
              <div className="col-span-2 pd-card p-4">
                <p className="text-[12.5px] text-white/55 leading-relaxed">
                  لسه مفيش أصناف مربوطة بـ {activeVehicle.displayName} — دوّر بكود الصنف أو كلّمنا.
                </p>
              </div>
            )}
            {!fitLoading &&
              fitProducts.map((p: any) => (
                <FitPartCard key={p.id} product={p} year={activeVehicle.year} />
              ))}
          </div>
        </section>
      )}

      {/* ───────────── Categories (rail 1 of 2) ───────────── */}
      <section className="mt-8 pd-reveal" style={{ "--d": "80ms" } as React.CSSProperties}>
        <SectionHeader title="تسوّق حسب الفئة" to="/products" kicker="CATEGORIES" />
        <div className={`flex gap-3 overflow-x-auto pd-rail ${GUTTER} mt-3.5 pb-1`}>
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.slug}
              to={`/products?category=${c.slug}`}
              onClick={() => void haptic("light")}
              className="pd-snap shrink-0 w-[136px] rounded-[18px] overflow-hidden pd-hair relative ios-press pd-s2"
            >
              <div className="aspect-[3/4]">
                <img
                  src={c.img}
                  alt={c.label}
                  loading="lazy"
                  decoding="async"
                  width={136}
                  height={181}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 pd-scrim" />
              <span className="absolute top-2.5 right-3 pd-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <span className="block text-[13px] font-semibold text-white leading-tight">{c.label}</span>
                <span className="mt-1.5 block h-[2px] w-7 rounded bg-gold" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────────── Brands (rail 2 of 2) ───────────── */}
      <section className="mt-8 pd-reveal" style={{ "--d": "120ms" } as React.CSSProperties}>
        <SectionHeader title="ماركاتنا" to="/products" kicker="BRANDS" />
        <div className={`flex gap-3 overflow-x-auto pd-rail ${GUTTER} mt-3.5 pb-1`}>
          {BRANDS.map((b) => (
            <Link
              key={b.to}
              to={b.to}
              onClick={() => void haptic("light")}
              className="pd-snap shrink-0 w-[112px] pd-card p-2 ios-press"
            >
              <div className="h-[60px] rounded-[12px] bg-white grid place-items-center px-2">
                <img src={b.img} alt={b.label} loading="lazy" decoding="async" className="max-h-8 w-auto object-contain" />
              </div>
              <p className="text-[11px] text-white/70 text-center mt-2 leading-tight truncate">{b.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────────── New arrivals (grid, not a rail) ───────────── */}
      <section className="mt-8 pd-reveal" style={{ "--d": "160ms" } as React.CSSProperties}>
        <SectionHeader title="وصل حديثاً" to="/products" kicker="NEW ARRIVALS" />
        <div className={`${GUTTER} mt-3.5 grid grid-cols-2 gap-3`}>
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[268px] rounded-[16px] pd-skeleton" />
            ))}
          {!isLoading &&
            products.map((p: any) => (
              <FitPartCard key={p.id} product={p} year={activeVehicle?.year ?? null} />
            ))}
        </div>
      </section>

      {/* ───────────── Guest CTA ───────────── */}
      {!user && (
        <section className={`${GUTTER} mt-7`}>
          <div className="pd-card p-4">
            <h3 className="text-[15px] font-semibold">اعرف أسعارك الخاصة</h3>
            <p className="text-[12.5px] text-white/55 mt-1.5 leading-relaxed">
              سجّل حسابك وشوف الأسعار والعروض المخصصة ليك.
            </p>
            <div className="flex gap-2.5 mt-4">
              <Link
                to="/auth"
                onClick={() => void haptic("light")}
                className="flex-1 h-11 grid place-items-center rounded-[12px] bg-gold text-black text-[13.5px] font-semibold ios-press"
              >
                إنشاء حساب
              </Link>
              <Link
                to="/dealer-login"
                onClick={() => void haptic("light")}
                className="flex-1 h-11 grid place-items-center rounded-[12px] pd-s3 pd-hair text-[13.5px] font-medium ios-press"
              >
                دخول التجّار
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────────── Services ───────────── */}
      <section className={`${GUTTER} mt-7`}>
        <GroupTitle>الخدمات</GroupTitle>
        <div className="rounded-[16px] pd-card overflow-hidden">
          {SERVICES.map((s) => (
            <ListRow key={s.to} {...s} />
          ))}
        </div>
      </section>

      {/* ───────────── Dealers ───────────── */}
      <section className={`${GUTTER} mt-6`}>
        <GroupTitle>بوابة التجّار</GroupTitle>
        <div className="rounded-[16px] pd-card overflow-hidden">
          {DEALER_LINKS.map((s) => (
            <ListRow key={s.to} {...s} />
          ))}
        </div>
      </section>

      {/* ───────────── Company ───────────── */}
      <section className={`${GUTTER} mt-6`}>
        <GroupTitle>المصرية جروب</GroupTitle>
        <div className="rounded-[16px] pd-card overflow-hidden">
          {ABOUT_LINKS.map((a) => (
            <ListRow key={a.to} {...a} />
          ))}
        </div>
      </section>

      {/* ───────────── Contact ───────────── */}
      <section className={`${GUTTER} mt-4`}>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://wa.me/201034806288"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-11 rounded-[12px] pd-s2 pd-hair ios-press"
          >
            <MessageCircle className="w-[17px] h-[17px] text-[#25D366]" />
            <span className="text-[13px] font-medium text-white/85">واتساب</span>
          </a>
          <a
            href="tel:+201034806288"
            onClick={() => void haptic("light")}
            className="flex items-center justify-center gap-2 h-11 rounded-[12px] pd-s2 pd-hair ios-press"
          >
            <Phone className="w-[17px] h-[17px] text-gold" />
            <span className="text-[13px] font-medium text-white/85">اتصل بنا</span>
          </a>
        </div>
      </section>

      <footer className={`${GUTTER} mt-8 flex flex-col items-center gap-2.5`}>
        <img src={logoDark} alt="المصرية جروب" className="h-6 w-auto object-contain opacity-60" />
        <p className="text-[11px] text-white/30 text-center pd-mono">Authorized Toyota Parts Distributor · 1999</p>
      </footer>

      {/* clearance for the floating tab bar */}
      <div style={{ height: "calc(env(safe-area-inset-bottom) + 104px)" }} />
      </div>
    </div>
  );
};

/* ── Building blocks ─────────────────────────────────────── */

const SectionHeader = ({ title, to, kicker }: { title: string; to: string; kicker?: string }) => (
  <div className={`${GUTTER} flex items-center justify-between gap-3`}>
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="pd-rule shrink-0" />
      <div className="min-w-0">
        {kicker && <span className="block pd-index leading-none mb-1">{kicker}</span>}
        <h2 className="text-[16px] font-semibold text-white leading-tight truncate">{title}</h2>
      </div>
    </div>
    <Link
      to={to}
      className="text-[12px] text-gold inline-flex items-center gap-0.5 ios-press py-1 shrink-0"
    >
      عرض الكل
      <ChevronLeft className="w-3.5 h-3.5" />
    </Link>
  </div>
);

const GroupTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[11px] text-white/40 mb-2 px-1 flex items-center gap-2">
    <span className="pd-rule h-3 opacity-70" />
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
    className="ios-row flex items-center gap-3 px-3.5 py-3 min-h-[56px] active:bg-white/[0.05] transition-colors"
  >
    <span className="w-9 h-9 rounded-[10px] pd-s3 grid place-items-center shrink-0">
      <Icon className="w-[17px] h-[17px] text-white/65" />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13.5px] font-medium leading-tight">{label}</span>
      <span className="block text-[11px] text-white/40 mt-0.5 leading-tight truncate">{hint}</span>
    </span>
    <ChevronLeft className="w-[18px] h-[18px] text-white/25 shrink-0" />
  </Link>
);

export default NativeHomeScreen;
