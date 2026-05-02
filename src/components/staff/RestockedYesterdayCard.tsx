import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp,
  Flame,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
  CalendarRange,
} from "lucide-react";

interface RestockedItem {
  product_id: string;
  sku: string;
  name_ar: string;
  brand: string | null;
  prev_stock: number;
  current_stock: number;
  delta: number;
  was_zero: boolean;
  had_shortage_request: boolean;
  shortage_requests_count: number;
  base_price: number | null;
  baseline_date: string | null;
  last_zero_date: string | null;
  days_since_zero: number | null;
}

type FilterMode = "all" | "shortages" | "was_zero";
type SortMode = "stock_desc" | "newest" | "oldest" | "part_asc" | "name_asc";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "stock_desc", label: "الرصيد (الأكبر أولاً)" },
  { value: "newest",     label: "الأحدث وصولاً" },
  { value: "oldest",     label: "الأقدم وصولاً" },
  { value: "part_asc",   label: "البارت نمبر (أبجدي)" },
  { value: "name_asc",   label: "اسم الصنف (أبجدي)" },
];

function formatZeroDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ar-EG", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}
type PeriodDays = 1 | 7 | 14 | 30;

const PERIOD_OPTIONS: { value: PeriodDays; label: string; shortLabel: string }[] = [
  { value: 1,  label: "امبارح",        shortLabel: "1 يوم" },
  { value: 7,  label: "آخر 7 أيام",   shortLabel: "7 أيام" },
  { value: 14, label: "آخر 14 يوم",   shortLabel: "14 يوم" },
  { value: 30, label: "آخر 30 يوم",   shortLabel: "30 يوم" },
];

export default function RestockedYesterdayCard() {
  const [items, setItems] = useState<RestockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodDays>(1);
  const [sort, setSort] = useState<SortMode>("stock_desc");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_restocked_items" as any, { _days_back: period });
      setItems((data as any) || []);
      setLoading(false);
    };
    load();
  }, [period]);

  const shortageCount = items.filter((i) => i.had_shortage_request).length;
  const wasZeroCount = items.filter((i) => i.was_zero).length;

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "shortages") list = list.filter((i) => i.had_shortage_request);
    else if (filter === "was_zero") list = list.filter((i) => i.was_zero);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name_ar?.toLowerCase().includes(q) ||
          i.sku?.toLowerCase().includes(q) ||
          i.brand?.toLowerCase().includes(q)
      );
    }
    // Sorting
    const sorted = [...list];
    const arCmp = (a: string, b: string) =>
      (a || "").localeCompare(b || "", "ar-EG", { numeric: true, sensitivity: "base" });
    const dateOf = (x: RestockedItem) =>
      x.baseline_date ? new Date(x.baseline_date).getTime() : 0;
    switch (sort) {
      case "stock_desc":
        sorted.sort((a, b) => (b.current_stock ?? 0) - (a.current_stock ?? 0));
        break;
      case "newest":
        sorted.sort((a, b) => dateOf(b) - dateOf(a));
        break;
      case "oldest":
        sorted.sort((a, b) => dateOf(a) - dateOf(b));
        break;
      case "part_asc":
        sorted.sort((a, b) => arCmp(a.sku, b.sku));
        break;
      case "name_asc":
        sorted.sort((a, b) => arCmp(a.name_ar, b.name_ar));
        break;
    }
    return sorted;
  }, [items, filter, search, sort]);

  const visibleItems = expanded ? filtered : filtered.slice(0, 8);

  if (loading) {
    return (
      <Card className="p-4 border-2 border-emerald-200 bg-emerald-50/30">
        <div className="flex items-center gap-2 text-emerald-700 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          جاري تحميل الأصناف اللي وصلت امبارح...
        </div>
      </Card>
    );
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "";

  if (items.length === 0) {
    return (
      <Card className="border-2 border-muted bg-muted/20">
        <div className="p-4 border-b border-muted/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Package className="w-4 h-4" />
            مفيش أصناف رصيدها زاد خلال {periodLabel}.
          </div>
          <PeriodSwitcher period={period} onChange={setPeriod} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/40 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-emerald-200/70 bg-white/40">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-emerald-900">🎉 وصل {periodLabel} — فرص بيع جاهزة</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                {items.length} صنف رصيدهم زاد خلال {periodLabel}
                {shortageCount > 0 && (
                  <>
                    {" • "}
                    <span className="font-bold text-rose-700">{shortageCount}</span> منهم كان عميل بيسأل عليهم
                  </>
                )}
              </p>
            </div>
          </div>
          <PeriodSwitcher period={period} onChange={setPeriod} />
        </div>

        {/* Search + Filters */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الصنف، البارت نمبر، الكود، أو الماركة..."
              className="pr-9 pl-8 h-9 text-sm bg-white border-emerald-200 focus-visible:ring-emerald-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="مسح"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-md bg-white border border-emerald-200 shrink-0">
            <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
              الكل ({items.length})
            </FilterPill>
            {shortageCount > 0 && (
              <FilterPill
                active={filter === "shortages"}
                onClick={() => setFilter("shortages")}
                tone="rose"
              >
                🔥 فرص ({shortageCount})
              </FilterPill>
            )}
            {wasZeroCount > 0 && (
              <FilterPill
                active={filter === "was_zero"}
                onClick={() => setFilter("was_zero")}
                tone="amber"
              >
                رجع من 0 ({wasZeroCount})
              </FilterPill>
            )}
          </div>

          {/* Sort dropdown */}
          <div dir="rtl" className="flex items-center gap-1.5 shrink-0">
            <label className="text-[11px] font-semibold text-emerald-900/80 whitespace-nowrap">
              ترتيب:
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="h-9 text-xs bg-white border border-emerald-200 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table-like header (RTL: right-to-left columns) */}
      <div
        dir="rtl"
        className="hidden sm:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_110px_130px_90px] gap-3 px-4 py-2 text-[11px] font-bold text-emerald-900/80 bg-emerald-100/60 border-b border-emerald-200"
      >
        <div>اسم الصنف</div>
        <div>البارت نمبر</div>
        <div className="text-center">الرصيد الجديد</div>
        <div className="text-center">آخر نفاد</div>
        <div className="text-center">الحالة</div>
      </div>

      {/* Rows */}
      <ScrollArea className={expanded ? "h-[420px]" : ""}>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            مفيش نتائج للبحث/الفلتر الحالي.
          </div>
        ) : (
          <div className="divide-y divide-emerald-100">
            {visibleItems.map((item) => (
              <div
                dir="rtl"
                key={item.product_id}
                className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_110px_130px_90px] gap-3 px-4 py-3 items-center transition-colors ${
                  item.had_shortage_request
                    ? "bg-rose-50/50 hover:bg-rose-100/60"
                    : "bg-white hover:bg-emerald-50/60"
                }`}
              >
                {/* اسم الصنف */}
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-muted-foreground sm:hidden mb-0.5">
                    اسم الصنف
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight break-words">
                    {item.name_ar}
                  </p>
                  {item.brand && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.brand}</p>
                  )}
                </div>

                {/* البارت نمبر (= SKU) */}
                <div className="min-w-0" dir="ltr">
                  <div className="text-[10px] font-bold text-muted-foreground sm:hidden mb-0.5" dir="rtl">
                    البارت نمبر
                  </div>
                  <span className="inline-block font-mono text-xs font-bold text-emerald-950 bg-emerald-100/70 px-2 py-1 rounded break-all tracking-wide">
                    {item.sku}
                  </span>
                </div>

                {/* الرصيد الجديد */}
                <div className="text-center">
                  <div className="text-[10px] font-bold text-muted-foreground sm:hidden mb-0.5">
                    الرصيد الجديد
                  </div>
                  <div className="font-mono">
                    <span className="text-base font-extrabold text-emerald-700">
                      {item.current_stock}
                    </span>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      من <span className="font-bold text-rose-600">{item.prev_stock}</span>
                      <span className="mx-0.5">+{item.delta}</span>
                    </div>
                  </div>
                </div>

                {/* آخر نفاد */}
                <div className="text-center">
                  <div className="text-[10px] font-bold text-muted-foreground sm:hidden mb-0.5">
                    آخر نفاد
                  </div>
                  {item.last_zero_date ? (
                    <div className="inline-flex flex-col items-center">
                      <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                        {formatZeroDate(item.last_zero_date)}
                      </span>
                      {typeof item.days_since_zero === "number" && (
                        <span className="text-[10px] text-amber-700 mt-0.5">
                          {item.days_since_zero === 0
                            ? "امبارح"
                            : `من ${item.days_since_zero} يوم`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>

                {/* الحالة */}
                <div className="flex sm:justify-center">
                  {item.had_shortage_request ? (
                    <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2 py-0.5 h-auto gap-0.5">
                      <Flame className="w-3 h-3" /> فرصة
                    </Badge>
                  ) : item.was_zero ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 h-auto">
                      رجع متاح
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto">
                      +{item.delta}
                    </Badge>
                  )}
                  {item.had_shortage_request && item.shortage_requests_count > 0 && (
                    <span className="hidden sm:inline ms-1 text-[10px] font-semibold text-rose-700 self-center">
                      ({item.shortage_requests_count})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {filtered.length > 8 && (
        <div className="border-t border-emerald-200/70 bg-white/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="w-full text-emerald-700 hover:bg-emerald-100 rounded-none"
          >
            {expanded ? (
              <>
                إخفاء <ChevronUp className="w-4 h-4 mr-1" />
              </>
            ) : (
              <>
                عرض الكل ({filtered.length}) <ChevronDown className="w-4 h-4 mr-1" />
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

function FilterPill({
  children,
  active,
  onClick,
  tone = "emerald",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "emerald" | "rose" | "amber";
}) {
  const toneActive = {
    emerald: "bg-emerald-600 text-white",
    rose: "bg-rose-600 text-white",
    amber: "bg-amber-500 text-white",
  }[tone];
  const toneIdle = {
    emerald: "text-emerald-700 hover:bg-emerald-100",
    rose: "text-rose-700 hover:bg-rose-100",
    amber: "text-amber-700 hover:bg-amber-100",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded whitespace-nowrap transition-colors ${
        active ? toneActive : toneIdle
      }`}
    >
      {children}
    </button>
  );
}

function PeriodSwitcher({
  period,
  onChange,
}: {
  period: PeriodDays;
  onChange: (p: PeriodDays) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-md bg-white border border-emerald-200 shrink-0">
      <CalendarRange className="w-3.5 h-3.5 text-emerald-700 mx-1.5 shrink-0" />
      {PERIOD_OPTIONS.map((opt) => {
        const active = period === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded whitespace-nowrap transition-colors ${
              active
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 hover:bg-emerald-100"
            }`}
            title={opt.label}
          >
            {opt.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
