import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CurrentlyInStockDialog from "@/components/staff/CurrentlyInStockDialog";
import TodayRestockedDialog from "@/components/staff/TodayRestockedDialog";
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
  Clock,
  Info,
  Check,
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

interface BaselineStatus {
  has_baseline: boolean;
  earliest_snapshot: string | null;
  latest_snapshot: string | null;
  distinct_days: number;
  baseline_target_date: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function RestockedYesterdayCard() {
  const [items, setItems] = useState<RestockedItem[]>([]);
  const [baseline, setBaseline] = useState<BaselineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodDays>(1);
  const [sort, setSort] = useState<SortMode>("stock_desc");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: itemsData }, { data: baseData }] = await Promise.all([
        supabase.rpc("get_restocked_items" as any, { _days_back: period }),
        supabase.rpc("restock_baseline_status" as any, { _days_back: period }),
      ]);
      setItems((itemsData as any) || []);
      const b = Array.isArray(baseData) ? baseData[0] : baseData;
      setBaseline((b as any) ?? null);
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

  // === Zero State #1: مفيش baseline سنابشوت سابق — أهم حالة ===
  if (baseline && !baseline.has_baseline) {
    const firstSnap = baseline.earliest_snapshot;
    return (
      <Card className="border-2 border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-emerald-50/40">
        <div className="p-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 shadow">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-sky-900">
                لسه بنجمع بيانات المخزون
              </h3>
              <p className="text-xs text-sky-800 mt-1 leading-relaxed">
                عشان نقدر نقولك "وصل خلال {periodLabel}" لازم يكون عندنا
                صورة (Snapshot) للمخزون قبل {formatDate(baseline.baseline_target_date)} على الأقل.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-sky-700 bg-sky-100/70 rounded px-2 py-1 w-fit">
                <Info className="w-3.5 h-3.5" />
                {firstSnap
                  ? <>أول Snapshot اتسجل: <span className="font-bold">{formatDate(firstSnap)}</span> — استنى للسنابشوت الجاي عشان نبدأ المقارنة.</>
                  : <>لسه مفيش أي Snapshot للمخزون. السنابشوت الأول بيتسجل تلقائياً 6 صباحاً.</>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <TodayRestockedDialog triggerLabel="🔄 عرفني إيه اللي وصل النهاردة" />
                <CurrentlyInStockDialog triggerLabel="📦 المتاح حالياً في المخزن" variant="ghost" />
              </div>
              <p className="text-[10px] text-sky-700/70 mt-1.5">
                "وصل النهاردة" بيقارن الرصيد الحالي بنقطة مقارنة لحظية تقدر تأخذها بضغطة زر — مفيد لو ضفت صنف لتوّك من الفيصل.
              </p>
            </div>
          </div>
          <PeriodSwitcher period={period} onChange={setPeriod} />
        </div>

        {/* لستة احترافية: الأصناف اللي وصلت النهاردة من الفيصل (مقارنة لحظية) */}
        <TodayErpRestockedInline />
      </Card>
    );
  }


  // === Zero State #2: في baseline لكن مفيش أصناف رصيدها زاد ===
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
        <div className="p-3 border-t border-muted/40 flex flex-wrap gap-2 bg-white/50">
          <TodayRestockedDialog triggerLabel="🔄 شوف اللي وصل النهاردة بمزامنة لحظية" />
          <CurrentlyInStockDialog triggerLabel="📦 المتاح حالياً" variant="ghost" />
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

// =====================================================
// Inline list: الأصناف اللي وصلت النهاردة من الفيصل
// (مقارنة لحظية مع snapshot الفيصل المثبت لليوم)
// =====================================================
interface ErpItem {
  erp_id: string;
  name: string;
  prev_qty: number;
  current_qty: number;
  delta: number;
  was_zero: boolean;
  is_new: boolean;
  retail_price: number | null;
  had_shortage_request: boolean;
  baseline_at: string | null;
}

const ERP_SEEN_KEY = "erp_restocked_seen_v1";
function loadSeen(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ERP_SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const fresh: Record<string, number> = {};
    Object.entries(parsed).forEach(([k, ts]) => {
      if (typeof ts === "number" && ts >= cutoff) fresh[k] = ts;
    });
    return fresh;
  } catch {
    return {};
  }
}
function saveSeen(map: Record<string, number>) {
  try { localStorage.setItem(ERP_SEEN_KEY, JSON.stringify(map)); } catch {}
}

type ErpPeriod = "today" | "yesterday" | "week" | "month";

const ERP_PERIOD_OPTIONS: { value: ErpPeriod; label: string; short: string }[] = [
  { value: "today",     label: "وصل النهاردة",   short: "النهاردة" },
  { value: "yesterday", label: "وصل امبارح",      short: "امبارح" },
  { value: "week",      label: "آخر 7 أيام",      short: "7 أيام" },
  { value: "month",     label: "آخر 30 يوم",     short: "30 يوم" },
];

function TodayErpRestockedInline() {
  const [items, setItems] = useState<ErpItem[]>([]);
  const [partNumberMap, setPartNumberMap] = useState<Record<string, string>>({});
  const [hasBaseline, setHasBaseline] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [seen, setSeen] = useState<Record<string, number>>(() => loadSeen());
  const [period, setPeriod] = useState<ErpPeriod>("today");

  const markSeen = (erpId: string) => {
    setSeen((prev) => {
      const next = { ...prev, [erpId]: Date.now() };
      saveSeen(next);
      return next;
    });
  };

  const load = async (p: ErpPeriod = period) => {
    setLoading(true);
    setExpanded(false);
    const [{ data: itemsData }, { data: baseData }] = await Promise.all([
      supabase.rpc("get_erp_restocked_items_period" as any, { _period: p }),
      supabase.rpc("erp_intraday_baseline_status" as any),
    ]);
    const list = ((itemsData as any) || []) as ErpItem[];
    setItems(list);
    const b = Array.isArray(baseData) ? baseData[0] : baseData;
    setHasBaseline(!!(b as any)?.has_baseline);

    const skus = Array.from(new Set(list.map((i) => i.erp_id).filter(Boolean)));
    if (skus.length > 0) {
      const { data: prodRows } = await supabase
        .from("products")
        .select("sku,name_ar")
        .in("sku", skus);
      const map: Record<string, string> = {};
      (prodRows || []).forEach((p: any) => {
        if (p?.sku && p?.name_ar) map[p.sku] = p.name_ar;
      });
      setPartNumberMap(map);
    } else {
      setPartNumberMap({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const filtered = useMemo(() => {
    // اخفي الأصناف اللي الموظف ضغط عليها "تم الاطلاع" خلال آخر 24 ساعة
    const visibleItems = items.filter((i) => !seen[i.erp_id]);
    const q = search.trim().toLowerCase();
    if (!q) return visibleItems;
    return visibleItems.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.erp_id?.toLowerCase().includes(q) ||
        (partNumberMap[i.erp_id] || "").toLowerCase().includes(q)
    );
  }, [items, search, seen, partNumberMap]);

  const visible = expanded ? filtered : filtered.slice(0, 6);
  const shortageCount = filtered.filter((i) => i.had_shortage_request).length;

  if (loading) {
    return (
      <div className="border-t border-sky-200/70 bg-white/40 p-4 flex items-center gap-2 text-sky-700 text-xs">
        <Loader2 className="w-4 h-4 animate-spin" />
        جاري فحص أصناف الفيصل...
      </div>
    );
  }

  if (!hasBaseline) {
    return (
      <div className="border-t border-sky-200/70 bg-white/60 p-4">
        <div className="flex items-center gap-2 text-sky-900 text-xs font-semibold">
          <Info className="w-4 h-4" />
          لسه مفيش نقطة مقارنة لحظية للفيصل النهاردة.
        </div>
        <p className="text-[11px] text-sky-700 mt-1.5 leading-relaxed">
          اضغط <span className="font-bold">"🔄 عرفني إيه اللي وصل النهاردة"</span> فوق عشان نسجّل أول لقطة من رصيد الفيصل.
          بعدها أي صنف رصيده يزيد هيظهر هنا تلقائياً باسم + بارت نمبر + كمية.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-t border-sky-200/70 bg-white/60 p-4 text-center text-xs text-muted-foreground">
        مفيش أصناف رصيدها زاد في الفيصل بعد آخر نقطة مقارنة النهاردة.
      </div>
    );
  }

  return (
    <div className="border-t border-amber-200/70 bg-gradient-to-br from-amber-50/40 via-white to-emerald-50/30">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <TrendingUp className="w-4 h-4 text-amber-600" />
          🎉 وصل النهاردة من الفيصل
          <Badge className="bg-amber-600 text-white font-mono h-5 px-1.5 text-[10px]">
            {items.length}
          </Badge>
          {shortageCount > 0 && (
            <Badge className="bg-rose-600 text-white gap-0.5 h-5 px-1.5 text-[10px]">
              <Flame className="w-2.5 h-2.5" />
              {shortageCount} فرصة
            </Badge>
          )}
        </div>
        <div className="relative flex-1 min-w-[160px] ms-auto max-w-xs">
          <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث..."
            className="pr-7 pl-7 h-7 text-xs bg-white border-amber-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div
        dir="rtl"
        className="hidden sm:grid grid-cols-[100px_110px_110px_minmax(0,1fr)_minmax(0,1.4fr)_110px] gap-3 px-4 py-1.5 text-[10px] font-bold text-amber-900/80 bg-amber-100/60 border-y border-amber-200"
      >
        <div className="text-center">الحالة</div>
        <div className="text-center">الرصيد</div>
        <div>كود الفيصل</div>
        <div>البارت نمبر</div>
        <div>اسم الصنف</div>
        <div className="text-center">إجراء</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-amber-100">
        {visible.map((item) => {
          const partNumber = partNumberMap[item.erp_id];
          return (
          <div
            dir="rtl"
            key={item.erp_id}
            className={`grid grid-cols-1 sm:grid-cols-[100px_110px_110px_minmax(0,1fr)_minmax(0,1.4fr)_110px] gap-3 px-4 py-2.5 items-center transition-colors ${
              item.had_shortage_request
                ? "bg-rose-50/50 hover:bg-rose-100/60"
                : "bg-white/60 hover:bg-amber-50/60"
            }`}
          >
            {/* الحالة */}
            <div className="flex sm:justify-center gap-1 flex-wrap">
              {item.had_shortage_request && (
                <Badge className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 h-auto gap-0.5">
                  <Flame className="w-3 h-3" /> فرصة
                </Badge>
              )}
              {item.is_new ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto border-blue-400 text-blue-700">
                  جديد
                </Badge>
              ) : item.was_zero ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 h-auto">
                  رجع متاح
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
                  +{item.delta}
                </Badge>
              )}
            </div>

            {/* الرصيد */}
            <div className="text-center">
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                {item.current_qty.toLocaleString("ar-EG")}
              </span>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                من <span className="font-bold text-rose-600">{item.prev_qty.toLocaleString("ar-EG")}</span>
                <span className="mx-0.5 text-emerald-600 font-bold">+{item.delta.toLocaleString("ar-EG")}</span>
              </div>
            </div>

            {/* كود الفيصل */}
            <div className="min-w-0" dir="ltr">
              <span className="inline-block font-mono text-xs font-bold text-amber-950 bg-amber-100/70 px-2 py-1 rounded break-all tracking-wide">
                {item.erp_id}
              </span>
            </div>

            {/* البارت نمبر */}
            <div className="min-w-0" dir="ltr">
              {partNumber ? (
                <span
                  className="inline-block font-mono text-[11px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded break-all tracking-wide"
                  title={partNumber}
                >
                  {partNumber}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground italic">— غير موجود في الموقع</span>
              )}
            </div>

            {/* اسم الصنف */}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight break-words">
                {item.name}
              </p>
              {item.retail_price && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  قطاعي: {Number(item.retail_price).toLocaleString("ar-EG")} ج.م
                </p>
              )}
            </div>

            {/* إجراء: تم الاطلاع */}
            <div className="flex sm:justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => markSeen(item.erp_id)}
                className="h-7 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <Check className="w-3.5 h-3.5" />
                تم الاطلاع
              </Button>
            </div>
          </div>
          );
        })}
      </div>

      {filtered.length > 6 && (
        <div className="border-t border-amber-200/70 bg-white/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="w-full text-amber-800 hover:bg-amber-100 rounded-none h-8 text-xs"
          >
            {expanded ? (
              <>إخفاء <ChevronUp className="w-3.5 h-3.5 mr-1" /></>
            ) : (
              <>عرض الكل ({filtered.length}) <ChevronDown className="w-3.5 h-3.5 mr-1" /></>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
