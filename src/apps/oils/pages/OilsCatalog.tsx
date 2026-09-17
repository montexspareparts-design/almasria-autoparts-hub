import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, SlidersHorizontal, Search, Zap, X, Fuel, Cog, Droplets, Snowflake, Layers, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOilsCatalog, type OilProduct } from "@/lib/oils/useOilsCatalog";
import OilProductCard from "../components/OilProductCard";
import { useDealerCart } from "@/hooks/useDealerCart";

type FilterKey = "all" | "offers" | "instock";
type CatKey = "all" | "gasoline" | "diesel" | "transmission" | "coolant" | "other";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "offers", label: "العروض" },
  { key: "instock", label: "المتاح فقط" },
];

/** تصنيف الصنف من اسمه */
const classify = (name: string): Exclude<CatKey, "all"> => {
  if (/سائل تبريد|ريداتير|coolant/i.test(name)) return "coolant";
  if (/فتيس|ATF|CVT|T-IV/i.test(name)) return "transmission";
  if (/ديزل/i.test(name)) return "diesel";
  if (/بنزين/i.test(name)) return "gasoline";
  return "other";
};

const CATEGORIES: { key: CatKey; label: string; desc: string; icon: typeof Fuel }[] = [
  { key: "all", label: "كل الأصناف", desc: "الكتالوج بالكامل", icon: LayoutGrid },
  { key: "gasoline", label: "زيوت البنزين", desc: "زيوت محركات البنزين", icon: Fuel },
  { key: "diesel", label: "زيوت الديزل", desc: "زيوت محركات الديزل", icon: Fuel },
  { key: "transmission", label: "زيوت الفتيس", desc: "أوتوماتيك ومانيوال وCVT", icon: Cog },
  { key: "coolant", label: "سوائل التبريد", desc: "مياه الردياتير الأصلية", icon: Snowflake },
  { key: "other", label: "زيوت أخرى", desc: "كرونة، باكم، باور، كلاتش", icon: Droplets },
];

const OilsCatalog = () => {
  const { products, loading, discountsFor, isDealer } = useOilsCatalog();
  const navigate = useNavigate();
  const { addItem } = useDealerCart();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>(searchParams.get("offers") === "1" ? "offers" : "all");
  const [category, setCategory] = useState<CatKey>("all");
  const [catsOpen, setCatsOpen] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<CatKey, number>();
    products.forEach((p) => {
      const c = classify(p.name_ar || "");
      map.set(c, (map.get(c) || 0) + 1);
    });
    map.set("all", products.length);
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    let list: OilProduct[] = products;
    if (category !== "all") list = list.filter((p) => classify(p.name_ar || "") === category);
    if (filter === "offers") list = list.filter((p) => p.is_on_sale);
    if (filter === "instock") list = list.filter((p) => p.stock_quantity > 0);
    const q = query.trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.name_ar?.includes(q) ||
          p.name_en?.toLowerCase().includes(q.toLowerCase()) ||
          p.sku?.includes(q) ||
          p.erp_item_code?.includes(q) ||
          p.part_number?.toLowerCase().includes(q.toLowerCase()),
      );
    }
    return list;
  }, [products, filter, query, category]);

  const activeCat = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];

  return (
    <main className="oils-screen oils-catalog" dir="rtl">
      <header className="oils-page-header">
        <div><span className="oils-eyebrow">ALMASRIA WHOLESALE</span><h1>الكتالوج</h1></div>
        <button type="button" className="oils-circle-button" aria-label="الإشعارات" onClick={() => navigate("/oils/notifications")}><Bell /></button>
      </header>

      {/* البحث */}
      <div className="oils-search-wrap">
        <Search />
        <input
          className="oils-search"
          placeholder="ابحث بالاسم أو كود الصنف أو البارت نمبر…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="بحث في الزيوت"
        />
        <button
          type="button"
          aria-label="التصنيفات"
          className={`oils-search-filter-btn ${catsOpen || category !== "all" ? "is-active" : ""}`}
          onClick={() => setCatsOpen((v) => !v)}
        >
          <SlidersHorizontal />
          {category !== "all" && <i className="oils-filter-dot" />}
        </button>
      </div>

      {/* لوحة التصنيفات */}
      <AnimatePresence initial={false}>
        {catsOpen && (
          <motion.div
            className="oils-cats-panel"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="oils-cats-head">
              <span><Layers /> تصنيفات الزيوت</span>
              <button type="button" aria-label="إغلاق" onClick={() => setCatsOpen(false)}><X /></button>
            </div>
            <div className="oils-cats-grid">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const count = counts.get(c.key) || 0;
                const active = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    className={`oils-cat-card ${active ? "is-active" : ""}`}
                    onClick={() => { setCategory(c.key); setCatsOpen(false); }}
                  >
                    <i className="oils-cat-icon"><Icon /></i>
                    <b>{c.label}</b>
                    <small>{c.desc}</small>
                    <em className="oils-num">{count} صنف</em>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الفلاتر */}
      <div className="oils-filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`oils-filter-pill ${filter === f.key ? "is-active" : ""}`}
          >
            {f.label}
          </button>
        ))}
        {category !== "all" && (
          <button type="button" className="oils-filter-pill oils-cat-pill" onClick={() => setCategory("all")}>
            {activeCat.label} <X />
          </button>
        )}
        <button type="button" className="oils-filter-pill oils-quick-pill" onClick={() => navigate("/oils/quick")}><Zap /> طلب سريع</button>
      </div>

      {loading ? (
        <div className="oils-product-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="oils-skeleton h-[292px]" />)}</div>
      ) : (
        <div className="oils-product-grid">
          {filtered.map((p) => (
            <OilProductCard key={p.id} product={p} discounts={discountsFor(p)} canSeePrice={isDealer} onAdd={(prod, qty) => void addItem(prod.id, qty)} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-[12px] py-10" style={{ color: "hsl(var(--oils-muted))" }}>
              لا توجد نتائج مطابقة — جرّب كلمة أو تصنيف مختلف.
            </p>
          )}
        </div>
      )}
    </main>
  );
};

export default OilsCatalog;
