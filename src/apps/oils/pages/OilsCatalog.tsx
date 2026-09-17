import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Droplets, Search } from "lucide-react";
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
    <div className="px-4 pt-5 space-y-4" dir="rtl">
      <h1 className="text-[18px] font-extrabold flex items-center gap-2">
        <Droplets className="w-5 h-5" style={{ color: "hsl(var(--oils-accent))" }} />
        كتالوج الزيوت
        <span className="oils-chip oils-num">{filtered.length} صنف</span>
      </h1>

      {/* البحث */}
      <div className="relative">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--oils-muted))" }} />
        <input
          className="oils-input !pr-10"
          placeholder="ابحث بالاسم أو كود الصنف أو البارت نمبر…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="بحث في الزيوت"
        />
      </div>

      {/* الفلاتر */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="oils-chip !text-[11.5px] !py-1.5 !px-3.5"
            style={
              filter === f.key
                ? { borderColor: "hsl(var(--oils-accent) / 0.5)", background: "hsl(var(--oils-accent-soft))", color: "hsl(var(--oils-accent))" }
                : undefined
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="oils-skeleton h-[130px]" />)}</div>
      ) : (
        <div className="space-y-3">
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
    </div>
  );
};

export default OilsCatalog;
