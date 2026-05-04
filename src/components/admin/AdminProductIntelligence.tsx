import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2,
  Copy, Download, Filter, Loader2, Package, RefreshCw, Search, ShieldAlert,
  Sparkles, TrendingDown, TrendingUp, X, XCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================
type RangeKey = "today" | "yesterday" | "7d" | "30d";
type StockFilter = "all" | "increased" | "decreased" | "in_to_zero" | "zero_to_in";
type PriceFilter = "all" | "up" | "down";

interface StockDiffRow {
  product_id: string;
  name_ar: string;
  part_number: string | null;
  sku: string | null;
  erp_item_code: string | null;
  brand: string | null;
  old_qty: number;
  new_qty: number;
  delta: number;
  change_pct: number | null;
}

interface PriceChangeRow {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  change_percentage: number;
  source: string;
  created_at: string;
  name_ar?: string;
  part_number?: string | null;
  sku?: string | null;
  erp_item_code?: string | null;
  brand?: string | null;
}

// ============================================================================
// Helpers
// ============================================================================
const todayStr = () => new Date().toISOString().split("T")[0];
const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

// نقارن snapshot أقدم بـ snapshot أحدث (أو الرصيد الحالي لو لحد النهاردة)
const getRange = (k: RangeKey): { from: string; to: string; label: string } => {
  switch (k) {
    case "today":     return { from: daysAgoStr(1),    to: todayStr(),       label: "اليوم" };
    case "yesterday": return { from: daysAgoStr(2),    to: daysAgoStr(1),    label: "امبارح" };
    case "7d":        return { from: daysAgoStr(7),    to: todayStr(),       label: "آخر 7 أيام" };
    case "30d":       return { from: daysAgoStr(30),   to: todayStr(),       label: "آخر 30 يوم" };
  }
};

const fmtNum = (n: number) => n.toLocaleString("ar-EG");
const fmtMoney = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
const fmtPct = (n: number | null) => n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

const BRAND_LABEL: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  denso: "دنسو",
  aisin: "ايسن",
  mtx_aftermarket: "مونتكس",
  toyota: "تويوتا",
  lexus: "لكزس",
};
const brandLabel = (b: string | null | undefined) => (b ? (BRAND_LABEL[b] || b) : "—");

// Highlight matching substring inside text (case-insensitive, safe regex)
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const Highlight = ({ text, query }: { text: string | null | undefined; query: string }) => {
  const t = text ?? "";
  const q = query.trim();
  if (!q) return <>{t || "—"}</>;
  try {
    const parts = t.split(new RegExp(`(${escapeRegex(q)})`, "ig"));
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-foreground rounded px-0.5">{p}</mark>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </>
    );
  } catch {
    return <>{t || "—"}</>;
  }
};

const downloadCSV = (filename: string, rows: any[][], headers: string[]) => {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ============================================================================
// Component
// ============================================================================
export default function AdminProductIntelligence() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<"stock" | "prices">("stock");
  const [range, setRange] = useState<RangeKey>("today");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [minChange, setMinChange] = useState<string>("0"); // min absolute change

  // Stock data
  const [stockRows, setStockRows] = useState<StockDiffRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [stockSort, setStockSort] = useState<"abs_delta" | "delta_desc" | "delta_asc" | "pct_desc" | "name">("abs_delta");

  // Price data
  const [priceRows, setPriceRows] = useState<PriceChangeRow[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

  // ERP sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ step: number; total: number; label: string; done?: boolean; error?: boolean } | null>(null);

  // ----- Loaders
  const loadStock = useCallback(async () => {
    setStockLoading(true);
    const { from, to } = getRange(range);
    const { data, error } = await supabase.rpc("get_stock_diff_in_range", { p_from: from, p_to: to });
    if (error) {
      toast({ title: "فشل تحميل تقرير المخزون", description: error.message, variant: "destructive" });
      setStockRows([]);
    } else {
      setStockRows((data || []) as StockDiffRow[]);
    }
    setStockLoading(false);
  }, [range, toast]);

  const loadPrices = useCallback(async () => {
    setPriceLoading(true);
    const { from, to } = getRange(range);
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;
    const { data, error } = await supabase
      .from("price_change_history")
      .select("id, product_id, old_price, new_price, change_percentage, source, created_at, products:product_id(name_ar, part_number, sku, erp_item_code, brand)")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      toast({ title: "فشل تحميل تقرير الأسعار", description: error.message, variant: "destructive" });
      setPriceRows([]);
    } else {
      const flat: PriceChangeRow[] = (data || []).map((r: any) => ({
        id: r.id, product_id: r.product_id,
        old_price: Number(r.old_price), new_price: Number(r.new_price),
        change_percentage: Number(r.change_percentage), source: r.source,
        created_at: r.created_at,
        name_ar: r.products?.name_ar, part_number: r.products?.part_number,
        sku: r.products?.sku, erp_item_code: r.products?.erp_item_code,
        brand: r.products?.brand,
      }));
      setPriceRows(flat);
    }
    setPriceLoading(false);
  }, [range, toast]);

  useEffect(() => { if (isAdmin) loadStock(); }, [isAdmin, loadStock]);
  useEffect(() => { if (isAdmin && tab === "prices") loadPrices(); }, [isAdmin, tab, loadPrices]);

  // ----- ERP Sync
  const handleErpSync = async () => {
    setSyncing(true);
    setSyncProgress({ step: 0, total: 2, label: "بدء المزامنة..." });
    try {
      setSyncProgress({ step: 1, total: 2, label: "مزامنة الأرصدة من الفيصل..." });
      const stockRes = await supabase.functions.invoke("erp-sync-outbound", { body: { action: "sync_stock" } });
      if (stockRes.error) throw new Error(stockRes.error.message || "stock sync failed");

      setSyncProgress({ step: 2, total: 2, label: "مزامنة الأسعار من الفيصل..." });
      const priceRes = await supabase.functions.invoke("erp-sync-outbound", { body: { action: "sync_prices" } });
      if (priceRes.error) throw new Error(priceRes.error.message || "price sync failed");

      setSyncProgress({ step: 2, total: 2, label: "اكتملت المزامنة بنجاح!", done: true });
      toast({ title: "✅ تمت المزامنة", description: "جارٍ تحديث التقارير..." });
      await Promise.all([loadStock(), tab === "prices" ? loadPrices() : Promise.resolve()]);
      setTimeout(() => setSyncProgress(null), 2500);
    } catch (e: any) {
      setSyncProgress({ step: 0, total: 2, label: `فشلت المزامنة: ${e.message}`, error: true });
      toast({ title: "❌ فشل المزامنة", description: e.message, variant: "destructive" });
      setTimeout(() => setSyncProgress(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // ----- Brand options (from current dataset)
  const brandOptions = useMemo(() => {
    const src = tab === "stock" ? stockRows : priceRows;
    const set = new Set<string>();
    src.forEach((r: any) => { if (r.brand) set.add(r.brand); });
    return Array.from(set).sort();
  }, [tab, stockRows, priceRows]);

  // ----- Filtering & sorting (stock)
  const filteredStock = useMemo(() => {
    let arr = [...stockRows];
    const q = search.trim().toLowerCase();
    const minC = Math.max(0, Number(minChange) || 0);
    if (q) {
      arr = arr.filter((r) =>
        (r.name_ar || "").toLowerCase().includes(q) ||
        (r.part_number || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.erp_item_code || "").toLowerCase().includes(q)
      );
    }
    if (brandFilter !== "all") arr = arr.filter((r) => r.brand === brandFilter);
    if (minC > 0) arr = arr.filter((r) => Math.abs(r.delta) >= minC);
    if (stockFilter === "increased") arr = arr.filter((r) => r.delta > 0);
    else if (stockFilter === "decreased") arr = arr.filter((r) => r.delta < 0);
    else if (stockFilter === "zero_to_in") arr = arr.filter((r) => r.old_qty === 0 && r.new_qty > 0);
    else if (stockFilter === "in_to_zero") arr = arr.filter((r) => r.old_qty > 0 && r.new_qty === 0);

    arr.sort((a, b) => {
      if (stockSort === "abs_delta") return Math.abs(b.delta) - Math.abs(a.delta);
      if (stockSort === "delta_desc") return b.delta - a.delta;
      if (stockSort === "delta_asc") return a.delta - b.delta;
      if (stockSort === "name") return (a.name_ar || "").localeCompare(b.name_ar || "", "ar");
      return (b.change_pct ?? -Infinity) - (a.change_pct ?? -Infinity);
    });
    return arr;
  }, [stockRows, search, stockFilter, stockSort, brandFilter, minChange]);

  const filteredPrices = useMemo(() => {
    let arr = [...priceRows];
    const q = search.trim().toLowerCase();
    const minC = Math.max(0, Number(minChange) || 0);
    if (q) {
      arr = arr.filter((r) =>
        (r.name_ar || "").toLowerCase().includes(q) ||
        (r.part_number || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.erp_item_code || "").toLowerCase().includes(q)
      );
    }
    if (brandFilter !== "all") arr = arr.filter((r) => r.brand === brandFilter);
    if (minC > 0) arr = arr.filter((r) => Math.abs(r.change_percentage) >= minC);
    if (priceFilter === "up") arr = arr.filter((r) => r.new_price > r.old_price);
    else if (priceFilter === "down") arr = arr.filter((r) => r.new_price < r.old_price);
    return arr;
  }, [priceRows, search, priceFilter, brandFilter, minChange]);

  // ----- KPIs
  const stockKpi = useMemo(() => {
    const inc = stockRows.filter((r) => r.delta > 0);
    const dec = stockRows.filter((r) => r.delta < 0);
    const newlyIn = stockRows.filter((r) => r.old_qty === 0 && r.new_qty > 0).length;
    const wentOut = stockRows.filter((r) => r.old_qty > 0 && r.new_qty === 0).length;
    const totalAdded = inc.reduce((s, r) => s + r.delta, 0);
    const totalRemoved = dec.reduce((s, r) => s + Math.abs(r.delta), 0);
    return {
      changedCount: stockRows.length,
      increasedCount: inc.length,
      decreasedCount: dec.length,
      newlyIn, wentOut, totalAdded, totalRemoved,
    };
  }, [stockRows]);

  const priceKpi = useMemo(() => {
    const up = priceRows.filter((r) => r.new_price > r.old_price);
    const down = priceRows.filter((r) => r.new_price < r.old_price);
    const avgUp = up.length ? up.reduce((s, r) => s + r.change_percentage, 0) / up.length : 0;
    const avgDown = down.length ? down.reduce((s, r) => s + r.change_percentage, 0) / down.length : 0;
    const maxUp = up.reduce((m, r) => r.change_percentage > m ? r.change_percentage : m, 0);
    const maxDown = down.reduce((m, r) => r.change_percentage < m ? r.change_percentage : m, 0);
    return { total: priceRows.length, upCount: up.length, downCount: down.length, avgUp, avgDown, maxUp, maxDown };
  }, [priceRows]);

  // ----- Export
  const exportStock = () => {
    downloadCSV(
      `stock-report-${range}-${todayStr()}.csv`,
      filteredStock.map((r) => [
        r.name_ar, r.part_number || "", r.erp_item_code || r.sku || "",
        brandLabel(r.brand),
        r.old_qty, r.new_qty, r.delta, r.change_pct ?? "",
      ]),
      ["اسم الصنف", "بارت نمبر", "كود الصنف", "البراند", "كانت", "بقت", "التغيير", "نسبة %"],
    );
  };

  const exportPrices = () => {
    downloadCSV(
      `price-report-${range}-${todayStr()}.csv`,
      filteredPrices.map((r) => [
        r.name_ar || "", r.part_number || "", r.erp_item_code || r.sku || "",
        brandLabel(r.brand),
        r.old_price, r.new_price, r.change_percentage,
        new Date(r.created_at).toLocaleString("ar-EG"),
      ]),
      ["اسم الصنف", "بارت نمبر", "كود الصنف", "البراند", "السعر القديم", "السعر الجديد", "نسبة %", "وقت التغيير"],
    );
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: "تم النسخ", description: txt });
  };

  const clearFilters = () => {
    setSearch(""); setBrandFilter("all"); setMinChange("0");
    setStockFilter("all"); setPriceFilter("all");
  };
  const hasActiveFilters = !!search || brandFilter !== "all" || (Number(minChange) || 0) > 0 || stockFilter !== "all" || priceFilter !== "all";

  // ============================================================================
  // Access guard
  // ============================================================================
  if (authLoading) {
    return <Card className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></Card>;
  }
  if (!isAdmin) {
    return (
      <Card dir="rtl" className="p-8 sm:p-10 text-center max-w-xl mx-auto border-destructive/30 bg-destructive/5">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 grid place-items-center mx-auto mb-3">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-destructive mb-1">غير مصرّح بالوصول</h3>
        <p className="text-sm text-muted-foreground">هذه الصفحة مخصّصة للمدير (Admin) فقط.</p>
      </Card>
    );
  }

  const ranges: { key: RangeKey; label: string; icon: any }[] = [
    { key: "today",     label: "اليوم",        icon: Sparkles },
    { key: "yesterday", label: "امبارح",       icon: Activity },
    { key: "7d",        label: "آخر 7 أيام",   icon: BarChart3 },
    { key: "30d",       label: "آخر شهر",      icon: BarChart3 },
  ];

  // ----- KPI cards (clickable presets)
  const renderStockKpis = () => {
    const items = [
      { l: "أصناف اتغيّر رصيدها", v: stockKpi.changedCount, c: "text-primary",       bg: "bg-primary/10",       i: Package,        onClick: () => setStockFilter("all"),         active: stockFilter === "all" },
      { l: "زاد رصيدها",          v: stockKpi.increasedCount, c: "text-emerald-600", bg: "bg-emerald-500/10",   i: TrendingUp,     onClick: () => setStockFilter("increased"),   active: stockFilter === "increased" },
      { l: "نقص رصيدها",          v: stockKpi.decreasedCount, c: "text-amber-600",   bg: "bg-amber-500/10",     i: TrendingDown,   onClick: () => setStockFilter("decreased"),   active: stockFilter === "decreased" },
      { l: "وصلت بعد نفاد",       v: stockKpi.newlyIn,       c: "text-emerald-600",  bg: "bg-emerald-500/10",   i: Sparkles,       onClick: () => setStockFilter("zero_to_in"),  active: stockFilter === "zero_to_in" },
      { l: "نفدت بالكامل",        v: stockKpi.wentOut,       c: "text-red-600",      bg: "bg-red-500/10",       i: XCircle,        onClick: () => setStockFilter("in_to_zero"),  active: stockFilter === "in_to_zero" },
      { l: "إجمالي قطع زادت",     v: fmtNum(stockKpi.totalAdded),   c: "text-emerald-700", bg: "bg-emerald-500/5",  i: ArrowUpRight,   onClick: () => {},                            active: false },
      { l: "إجمالي قطع باعت",     v: fmtNum(stockKpi.totalRemoved), c: "text-amber-700",   bg: "bg-amber-500/5",    i: ArrowDownRight, onClick: () => {},                            active: false },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {items.map((k) => (
          <button
            key={k.l}
            onClick={k.onClick}
            className={`text-right p-3 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${
              k.active ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg grid place-items-center mb-1.5 ${k.bg}`}>
              <k.i className={`w-3.5 h-3.5 ${k.c}`} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-0.5">{k.l}</p>
            <p className="text-xl font-extrabold tabular-nums">{k.v}</p>
          </button>
        ))}
      </div>
    );
  };

  const renderPriceKpis = () => {
    const items = [
      { l: "إجمالي تغييرات",  v: priceKpi.total,         c: "text-primary",       bg: "bg-primary/10",     i: BarChart3,     onClick: () => setPriceFilter("all"),  active: priceFilter === "all" },
      { l: "زادت أسعار",       v: priceKpi.upCount,       c: "text-red-600",       bg: "bg-red-500/10",     i: TrendingUp,    onClick: () => setPriceFilter("up"),   active: priceFilter === "up" },
      { l: "نقصت أسعار",       v: priceKpi.downCount,     c: "text-emerald-600",   bg: "bg-emerald-500/10", i: TrendingDown,  onClick: () => setPriceFilter("down"), active: priceFilter === "down" },
      { l: "متوسط الزيادة",    v: fmtPct(priceKpi.avgUp), c: "text-red-600",       bg: "bg-red-500/5",      i: ArrowUpRight,  onClick: () => {}, active: false },
      { l: "متوسط النقص",      v: fmtPct(priceKpi.avgDown), c: "text-emerald-600", bg: "bg-emerald-500/5",  i: ArrowDownRight, onClick: () => {}, active: false },
      { l: "أعلى زيادة",       v: fmtPct(priceKpi.maxUp), c: "text-red-700",       bg: "bg-red-500/5",      i: ArrowUpRight,  onClick: () => {}, active: false },
      { l: "أعلى نقص",         v: fmtPct(priceKpi.maxDown), c: "text-emerald-700", bg: "bg-emerald-500/5",  i: ArrowDownRight, onClick: () => {}, active: false },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {items.map((k) => (
          <button
            key={k.l}
            onClick={k.onClick}
            className={`text-right p-3 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${
              k.active ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg grid place-items-center mb-1.5 ${k.bg}`}>
              <k.i className={`w-3.5 h-3.5 ${k.c}`} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-0.5">{k.l}</p>
            <p className="text-xl font-extrabold tabular-nums">{k.v}</p>
          </button>
        ))}
      </div>
    );
  };

  // Filters bar (shared)
  const FiltersBar = ({
    onRefresh, refreshing, onExport, exportDisabled, extraFilter,
  }: {
    onRefresh: () => void; refreshing: boolean;
    onExport: () => void; exportDisabled: boolean;
    extraFilter?: React.ReactNode;
  }) => (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث: اسم الصنف، بارت نمبر، أو كود الصنف..."
            className="pr-9 h-10 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="h-10 w-[150px]">
            <SelectValue placeholder="كل البراندات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل البراندات</SelectItem>
            {brandOptions.map((b) => (
              <SelectItem key={b} value={b}>{brandLabel(b)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {extraFilter}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">حد أدنى للتغيير:</span>
          <Input
            type="number"
            value={minChange}
            onChange={(e) => setMinChange(e.target.value)}
            className="h-10 w-[80px] text-sm tabular-nums"
            min={0}
          />
        </div>

        <div className="flex items-center gap-1.5 mr-auto">
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1.5 h-9 text-xs">
              <X className="w-3.5 h-3.5" /> مسح الفلاتر
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing} className="gap-1.5 h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button size="sm" variant="outline" onClick={onExport} disabled={exportDisabled} className="gap-1.5 h-9">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div dir="rtl" className="space-y-4">
        {/* Hero */}
        <Card className="p-4 sm:p-5 border-2 border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center shadow-md">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">ذكاء المنتجات — تقارير المخزون والأسعار</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  تقارير لحظية للأصناف الجديدة، تغيّرات الأرصدة والأسعار، مع مزامنة فورية للفيصل
                </p>
              </div>
            </div>

            <Button onClick={handleErpSync} disabled={syncing} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              مزامنة الفيصل الآن
            </Button>
          </div>

          {syncProgress && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{syncProgress.label}</span>
                {syncProgress.done && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {syncProgress.error && <XCircle className="w-4 h-4 text-destructive" />}
              </div>
              <Progress value={(syncProgress.step / syncProgress.total) * 100} className="h-2" />
              <span className="text-xs text-muted-foreground mt-1 inline-block">الخطوة {syncProgress.step} من {syncProgress.total}</span>
            </motion.div>
          )}
        </Card>

        {/* Range selector */}
        <Card className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground ml-1">الفترة:</span>
            {ranges.map((r) => {
              const active = range === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-xs sm:text-sm font-semibold transition-all border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <r.icon className="w-3.5 h-3.5" />
                  {r.label}
                </button>
              );
            })}
            <span className="text-xs text-muted-foreground mr-auto">
              {getRange(range).from} → {getRange(range).to}
            </span>
          </div>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-grid">
            <TabsTrigger value="stock" className="gap-2">
              <Package className="w-4 h-4" />
              تقرير المخزون
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              تقرير الأسعار
            </TabsTrigger>
          </TabsList>

          {/* ============================ STOCK ============================ */}
          <TabsContent value="stock" className="mt-4 space-y-4">
            {renderStockKpis()}

            <FiltersBar
              onRefresh={loadStock}
              refreshing={stockLoading}
              onExport={exportStock}
              exportDisabled={!filteredStock.length}
              extraFilter={
                <Select value={stockSort} onValueChange={(v) => setStockSort(v as any)}>
                  <SelectTrigger className="h-10 w-[160px]">
                    <Filter className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abs_delta">الأكثر تغيّراً</SelectItem>
                    <SelectItem value="delta_desc">الأكثر زيادة</SelectItem>
                    <SelectItem value="delta_asc">الأكثر نقصاً</SelectItem>
                    <SelectItem value="pct_desc">أعلى نسبة %</SelectItem>
                    <SelectItem value="name">ترتيب أبجدي</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(220px,2.5fr)_minmax(120px,1fr)_minmax(90px,0.8fr)_70px_70px_90px_80px] gap-3 px-4 py-3 text-[11px] font-bold text-muted-foreground bg-muted/40 border-b sticky top-0 z-10">
                <div className="text-right">الصنف</div>
                <div className="text-right">بارت نمبر</div>
                <div className="text-right">كود الصنف</div>
                <div className="text-center">كانت</div>
                <div className="text-center">بقت</div>
                <div className="text-center">التغيير</div>
                <div className="text-center">النسبة</div>
              </div>

              {stockLoading ? (
                <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />جارٍ التحميل...</div>
              ) : filteredStock.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto opacity-40 mb-2" />
                  لا توجد تغييرات في هذا النطاق
                </div>
              ) : (
                <div className="divide-y max-h-[65vh] overflow-y-auto">
                  {filteredStock.map((r, idx) => {
                    const positive = r.delta > 0;
                    const newlyIn = r.old_qty === 0 && r.new_qty > 0;
                    const out = r.old_qty > 0 && r.new_qty === 0;
                    const code = r.erp_item_code || r.sku || "—";
                    return (
                      <div
                        key={r.product_id}
                        className={`grid grid-cols-1 md:grid-cols-[minmax(220px,2.5fr)_minmax(120px,1fr)_minmax(90px,0.8fr)_70px_70px_90px_80px] gap-2 md:gap-3 px-4 py-3 items-center text-sm hover:bg-muted/30 transition-colors ${idx % 2 ? "bg-muted/10" : ""}`}
                      >
                        {/* الاسم */}
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="font-semibold text-[14px] leading-relaxed break-words text-right cursor-default whitespace-normal">
                                  <Highlight text={r.name_ar} query={search} />
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-md">{r.name_ar}</TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {r.brand && <Badge variant="outline" className="text-[10px] h-5">{brandLabel(r.brand)}</Badge>}
                            {newlyIn && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] h-5">🎉 وصل بعد نفاد</Badge>}
                            {out && <Badge variant="destructive" className="text-[10px] h-5">⚠️ نفد</Badge>}
                          </div>
                        </div>

                        {/* بارت نمبر */}
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="md:hidden text-[10px] text-muted-foreground ml-1">بارت:</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => r.part_number && copyText(r.part_number)}
                                className="font-mono text-[12px] text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded truncate inline-flex items-center gap-1"
                                title={r.part_number || ""}
                              >
                                <Highlight text={r.part_number} query={search} />
                                {r.part_number && <Copy className="w-3 h-3 opacity-40" />}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{r.part_number || "—"}</TooltipContent>
                          </Tooltip>
                        </div>

                        {/* كود الصنف */}
                        <div className="flex items-center gap-1">
                          <span className="md:hidden text-[10px] text-muted-foreground ml-1">كود:</span>
                          <button
                            onClick={() => code !== "—" && copyText(code)}
                            className="font-mono text-[12px] text-slate-700 hover:bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1"
                          >
                            <Highlight text={code} query={search} />
                            {code !== "—" && <Copy className="w-3 h-3 opacity-40" />}
                          </button>
                        </div>

                        {/* كانت */}
                        <div className="text-center">
                          <span className="md:hidden text-[10px] text-muted-foreground ml-1">كانت:</span>
                          <span className="tabular-nums text-muted-foreground text-[14px]">{r.old_qty}</span>
                        </div>

                        {/* بقت */}
                        <div className="text-center">
                          <span className="md:hidden text-[10px] text-muted-foreground ml-1">بقت:</span>
                          <span className="tabular-nums font-bold text-[15px]">{r.new_qty}</span>
                        </div>

                        {/* التغيير */}
                        <div className="text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded-md font-bold tabular-nums text-[13px] ${
                              positive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {positive ? "+" : ""}{r.delta}
                          </span>
                        </div>

                        {/* النسبة */}
                        <div className="text-center">
                          <span className={`text-[12px] font-bold tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}>
                            {fmtPct(r.change_pct)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
                <span>عرض <strong className="text-foreground">{filteredStock.length}</strong> من {stockRows.length}</span>
                <span>الفترة: {getRange(range).label}</span>
              </div>
            </Card>
          </TabsContent>

          {/* ============================ PRICES ============================ */}
          <TabsContent value="prices" className="mt-4 space-y-4">
            {renderPriceKpis()}

            <FiltersBar
              onRefresh={loadPrices}
              refreshing={priceLoading}
              onExport={exportPrices}
              exportDisabled={!filteredPrices.length}
            />

            <Card className="overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(0,2fr)_140px_110px_110px_110px_100px_120px] gap-3 px-4 py-3 text-[11px] font-bold text-muted-foreground bg-muted/40 border-b sticky top-0 z-10">
                <div className="text-right">الصنف</div>
                <div className="text-right">بارت نمبر</div>
                <div className="text-right">كود الصنف</div>
                <div className="text-center">السعر القديم</div>
                <div className="text-center">السعر الجديد</div>
                <div className="text-center">النسبة</div>
                <div className="text-center">الوقت</div>
              </div>

              {priceLoading ? (
                <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />جارٍ التحميل...</div>
              ) : filteredPrices.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <TrendingUp className="w-10 h-10 mx-auto opacity-40 mb-2" />
                  لا توجد تغييرات أسعار في هذا النطاق
                </div>
              ) : (
                <div className="divide-y max-h-[65vh] overflow-y-auto">
                  {filteredPrices.map((r, idx) => {
                    const up = r.new_price > r.old_price;
                    const code = r.erp_item_code || r.sku || "—";
                    return (
                      <div
                        key={r.id}
                        className={`grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_140px_110px_110px_110px_100px_120px] gap-2 md:gap-3 px-4 py-3 items-center text-sm hover:bg-muted/30 transition-colors ${idx % 2 ? "bg-muted/10" : ""}`}
                      >
                        <div className="min-w-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="font-semibold text-[14px] leading-relaxed break-words text-right cursor-default whitespace-normal">
                                {r.name_ar || "—"}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md">{r.name_ar}</TooltipContent>
                          </Tooltip>
                          {r.brand && <Badge variant="outline" className="text-[10px] h-5 mt-1">{brandLabel(r.brand)}</Badge>}
                        </div>

                        <button
                          onClick={() => r.part_number && copyText(r.part_number)}
                          className="font-mono text-[12px] text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded truncate inline-flex items-center gap-1 text-right"
                          title={r.part_number || ""}
                        >
                          {r.part_number || "—"}
                          {r.part_number && <Copy className="w-3 h-3 opacity-40" />}
                        </button>

                        <button
                          onClick={() => code !== "—" && copyText(code)}
                          className="font-mono text-[12px] text-slate-700 hover:bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1 text-right"
                        >
                          {code}
                          {code !== "—" && <Copy className="w-3 h-3 opacity-40" />}
                        </button>

                        <div className="text-center tabular-nums text-muted-foreground text-[14px]">{fmtMoney(r.old_price)}</div>
                        <div className="text-center font-bold tabular-nums text-[15px]">{fmtMoney(r.new_price)}</div>

                        <div className="text-center">
                          <span
                            className={`inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-md font-bold text-[12px] tabular-nums ${
                              up ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {r.change_percentage > 0 ? "+" : ""}{r.change_percentage.toFixed(1)}%
                          </span>
                        </div>

                        <div className="text-center text-[11px] text-muted-foreground tabular-nums">
                          {new Date(r.created_at).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
                <span>عرض <strong className="text-foreground">{filteredPrices.length}</strong> من {priceRows.length}</span>
                <span>الفترة: {getRange(range).label}</span>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
