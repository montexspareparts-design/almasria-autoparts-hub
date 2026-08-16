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
import NativePickerSheet from "@/components/native/NativePickerSheet";
import { VEHICLE_MODELS } from "@/data/vehicleCatalogue";


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

const QUICK_ACTIONS: {
  label: string;
  to?: string;
  sheet?: "model" | "type";
  icon: any;
}[] = [
  { label: "حسب الموديل", sheet: "model", icon: Car },
  { label: "حسب النوع", sheet: "type", icon: Wrench },
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
  const composingRef = useRef(false);
  const [picker, setPicker] = useState<"model" | "type" | null>(null);

  const [debounced, setDebounced] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: suggestions = [], isFetching: suggestLoading } = useQuery({
    queryKey: ["native_home_suggest", debounced],
    enabled: debounced.length >= 2,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const s = debounced.replace(/[%,]/g, " ").trim();
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, erp_item_code, part_number, image_url, brand, stock_quantity")
        .eq("is_active", true)
        .or(
          [
            `sku.ilike.%${s}%`,
            `erp_item_code.ilike.%${s}%`,
            `part_number.ilike.%${s}%`,
            `name_ar.ilike.%${s}%`,
          ].join(","),
        )
        .limit(8);
      return data || [];
    },
  });

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
    setSuggestOpen(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!query.trim()) return navigate("/products");
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };


  return (
    <div
      dir="rtl"
      className="pd-root min-h-screen text-white overflow-x-hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
    >
      {/* one ambient gold light source behind everything */}
      <div className="pd-aura" aria-hidden />

      <div className="pd-layer">
      {/* ───────────── Sticky header + search ───────────── */}
      <header
        className={`sticky top-0 z-40 pd-s1 pd-hair-b pd-head ${scrolled ? "pd-head-solid" : ""}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className={`h-[58px] ${GUTTER} flex items-center justify-between gap-3`}>
          <Link to="/" aria-label="الرئيسية" className="flex items-center min-w-0">
            <span className="relative grid place-items-center">
              <span
                className="absolute inset-0 -m-2 rounded-full bg-[hsl(var(--pd-accent)/0.16)] blur-lg"
                aria-hidden
              />
              <img
                src={logoDark}
                alt="المصرية جروب"
                className="relative h-8 w-auto object-contain"
              />
            </span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/cart"
              aria-label="السلة"
              onClick={() => void haptic("light")}
              className="relative w-9 h-9 rounded-[11px] pd-s2 pd-hair grid place-items-center ios-press"
            >
              <ShoppingBag className="w-[17px] h-[17px] text-white/85" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-white text-[10px] font-bold grid place-items-center pd-mono ring-2 ring-[hsl(var(--carbon-1))]">
                  {itemCount > 99 ? "99" : itemCount}
                </span>
              )}
            </Link>
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="w-9 h-9 rounded-[11px] pd-s2 pd-hair grid place-items-center ios-press"
            >
              <User className="w-[17px] h-[17px] text-white/85" />
            </Link>
          </div>
        </div>

        <div className={`${GUTTER} pb-3 relative`}>
          <form
            onSubmit={submitSearch}
            className="flex items-center gap-1.5 h-12 pr-3 pl-1.5 rounded-[14px] pd-s2 pd-hair shadow-lg shadow-black/30"
          >
            <Search className="w-[18px] h-[18px] text-gold shrink-0" />
            <input
              value={query}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                setQuery((e.target as HTMLInputElement).value);
              }}
              onChange={(e) => {
                if (composingRef.current) return;
                setQuery(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              placeholder="ابحث بكود الصنف أو البارت نمبر"
              className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-white placeholder:text-white/35"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              aria-label="بحث في الكتالوج"
            />
            {query && (
              <button
                type="button"
                aria-label="مسح البحث"
                onClick={() => {
                  setQuery("");
                  setSuggestOpen(false);
                }}
                className="w-6 h-6 rounded-full bg-white/10 text-white/60 text-[14px] leading-none grid place-items-center shrink-0"
              >
                ×
              </button>
            )}

            <span className="w-px h-6 bg-white/10 shrink-0" aria-hidden />

            <ImageSearchDialog
              onProductFound={(term) => navigate(`/products?search=${encodeURIComponent(term)}`)}
              trigger={
                <button
                  type="button"
                  onClick={() => void haptic("medium")}
                  aria-label="بحث بصورة القطعة"
                  className="w-9 h-9 rounded-[10px] grid place-items-center ios-press shrink-0"
                >
                  <Camera className="w-[18px] h-[18px] text-white/70" />
                </button>
              }
            />
            <button
              type="submit"
              aria-label="بحث"
              className="w-9 h-9 rounded-[10px] bg-gold text-white grid place-items-center ios-press shrink-0 shadow-md shadow-[hsl(var(--pd-accent)/0.35)]"
            >
              <Search className="w-[17px] h-[17px]" />
            </button>
          </form>


          {suggestOpen && debounced.length >= 2 && (
            <div className="absolute left-4 right-4 top-[56px] z-50 rounded-[14px] pd-s2 pd-hair overflow-hidden shadow-2xl shadow-black/60 max-h-[60vh] overflow-y-auto">
              {suggestLoading && suggestions.length === 0 ? (
                <div className="py-5 text-center text-[13px] text-white/50">جارٍ البحث…</div>
              ) : suggestions.length === 0 ? (
                <div className="py-5 text-center text-[13px] text-white/50">لا توجد نتائج مطابقة</div>
              ) : (
                suggestions.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      void haptic("light");
                      setSuggestOpen(false);
                      navigate(`/products?search=${encodeURIComponent(p.erp_item_code || p.sku || p.name_ar)}`);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-right border-b border-white/5 last:border-0 active:bg-white/5"
                  >
                    <div className="w-11 h-11 rounded-[10px] bg-white shrink-0 overflow-hidden grid place-items-center">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" loading="lazy" className="w-full h-full object-contain p-1" />
                      ) : (
                        <PackageSearch className="w-5 h-5 text-black/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white truncate">{p.name_ar}</p>
                      <p className="text-[11px] text-white/45 pd-mono truncate">
                        {[p.erp_item_code, p.part_number || p.sku].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {p.stock_quantity > 0 ? (
                      <span className="text-[10px] text-gold shrink-0">متاح</span>
                    ) : (
                      <span className="text-[10px] text-white/30 shrink-0">نافد</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
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
          {QUICK_ACTIONS.map((a) => {
            const cls =
              "pd-card h-[78px] flex flex-col items-center justify-center gap-1.5 ios-press relative overflow-hidden";
            const inner = (
              <>
                <span className="absolute top-0 inset-x-3 h-px bg-gradient-to-l from-transparent via-gold/30 to-transparent" />
                <span className="w-8 h-8 rounded-[10px] bg-gold/[0.09] border border-gold/15 grid place-items-center">
                  <a.icon className="w-[17px] h-[17px] text-gold" />
                </span>
                <span className="text-[10.5px] text-white/70 leading-none text-center px-1">{a.label}</span>
              </>
            );
            return a.to ? (
              <Link key={a.label} to={a.to} onClick={() => void haptic("light")} className={cls}>
                {inner}
              </Link>
            ) : (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  void haptic("light");
                  setPicker(a.sheet!);
                }}
                className={cls}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      {/* ───────────── Trust / value strip ───────────── */}
      <section className={`${GUTTER} mt-3 pd-reveal`} style={{ "--d": "50ms" } as React.CSSProperties}>
        <div className="rounded-[14px] pd-card overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-white/[0.06]">
            {[
              { k: "GENUINE", t: "قطع أصلية", s: "موزّع معتمد" },
              { k: "FREE SHIP", t: "شحن مجاني", s: "فوق 3000 ج" },
              { k: "NATIONWIDE", t: "كل مصر", s: "توصيل سريع" },
            ].map((it) => (
              <div key={it.k} className="px-2 py-3 text-center">
                <span className="block pd-index leading-none">{it.k}</span>
                <span className="block text-[12.5px] font-semibold text-white mt-1.5 leading-none">{it.t}</span>
                <span className="block text-[10.5px] text-white/40 mt-1 leading-none pd-mono">{it.s}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-gradient-to-l from-transparent via-gold/25 to-transparent" />
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
        <section className={`${GUTTER} mt-8`}>
          <div className="pd-hero pd-sheen p-4">
            <span className="relative pd-index">PRIVATE PRICING</span>
            <h3 className="relative text-[16px] font-semibold mt-2">اعرف أسعارك الخاصة</h3>
            <p className="relative text-[12.5px] text-white/55 mt-1.5 leading-relaxed">
              سجّل حسابك وشوف الأسعار والعروض المخصصة ليك.
            </p>
            <div className="relative flex gap-2.5 mt-4">
              <Link
                to="/auth"
                onClick={() => void haptic("light")}
                className="flex-1 h-11 grid place-items-center rounded-[12px] bg-gold text-white text-[13.5px] font-semibold ios-press"
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

      <NativePickerSheet
        open={picker === "model"}
        onClose={() => setPicker(null)}
        title="اختر موديل العربية"
        kicker="BROWSE BY MODEL"
        options={VEHICLE_MODELS.map((m) => ({
          label: m.label,
          to: `/products?search=${encodeURIComponent(m.label)}`,
        }))}
      />
      <NativePickerSheet
        open={picker === "type"}
        onClose={() => setPicker(null)}
        title="اختر نوع القطعة"
        kicker="BROWSE BY TYPE"
        options={CATEGORIES.map((c) => ({
          label: c.label,
          to: `/products?category=${c.slug}`,
        }))}
      />
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
