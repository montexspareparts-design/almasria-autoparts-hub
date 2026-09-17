import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, SlidersHorizontal, Search } from "lucide-react";
import { useOilsCatalog, type OilProduct } from "@/lib/oils/useOilsCatalog";
import OilProductCard from "../components/OilProductCard";
import { useDealerCart } from "@/hooks/useDealerCart";

type FilterKey = "all" | "offers" | "instock";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "offers", label: "العروض" },
  { key: "instock", label: "المتاح فقط" },
];

const OilsCatalog = () => {
  const { products, loading, discountsFor, isDealer } = useOilsCatalog();
  const { addItem } = useDealerCart();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>(searchParams.get("offers") === "1" ? "offers" : "all");

  const filtered = useMemo(() => {
    let list: OilProduct[] = products;
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
  }, [products, filter, query]);

  return (
    <main className="oils-screen oils-catalog" dir="rtl">
      <header className="oils-page-header">
        <div><span className="oils-eyebrow">ALMASRIA WHOLESALE</span><h1>الكتالوج</h1></div>
        <button type="button" className="oils-circle-button" aria-label="الإشعارات"><Bell /></button>
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
        <SlidersHorizontal className="oils-search-filter" />
      </div>

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
              لا توجد نتائج مطابقة — جرّب كلمة أو كود مختلف.
            </p>
          )}
        </div>
      )}
    </main>
  );
};

export default OilsCatalog;
