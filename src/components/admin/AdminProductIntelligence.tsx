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
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2,
  Download, Filter, Loader2, Package, RefreshCw, Search, ShieldAlert,
  Sparkles, TrendingDown, TrendingUp, XCircle,
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
  // joined
  name_ar?: string;
  part_number?: string | null;
  sku?: string | null;
  erp_item_code?: string | null;
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

const getRange = (k: RangeKey): { from: string; to: string; label: string } => {
  switch (k) {
    case "today":     return { from: todayStr(),       to: todayStr(),       label: "اليوم" };
    case "yesterday": return { from: daysAgoStr(1),    to: daysAgoStr(1),    label: "امبارح" };
    case "7d":        return { from: daysAgoStr(6),    to: todayStr(),       label: "آخر 7 أيام" };
    case "30d":       return { from: daysAgoStr(29),   to: todayStr(),       label: "آخر 30 يوم" };
  }
};

const fmtNum = (n: number) => n.toLocaleString("ar-EG");
const fmtMoney = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
const fmtPct = (n: number | null) => n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

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

  // Stock data
  const [stockRows, setStockRows] = useState<StockDiffRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [stockSort, setStockSort] = useState<"abs_delta" | "delta_desc" | "delta_asc" | "pct_desc">("abs_delta");

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
      .select("id, product_id, old_price, new_price, change_percentage, source, created_at, products:product_id(name_ar, part_number, sku, erp_item_code)")
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

  // ----- Filtering & sorting (stock)
  const filteredStock = useMemo(() => {
    let arr = [...stockRows];
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) =>
        (r.name_ar || "").toLowerCase().includes(q) ||
        (r.part_number || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.erp_item_code || "").toLowerCase().includes(q)
      );
    }
    if (stockFilter === "increased") arr = arr.filter((r) => r.delta > 0);
    else if (stockFilter === "decreased") arr = arr.filter((r) => r.delta < 0);
    else if (stockFilter === "zero_to_in") arr = arr.filter((r) => r.old_qty === 0 && r.new_qty > 0);
    else if (stockFilter === "in_to_zero") arr = arr.filter((r) => r.old_qty > 0 && r.new_qty === 0);

    arr.sort((a, b) => {
      if (stockSort === "abs_delta") return Math.abs(b.delta) - Math.abs(a.delta);
      if (stockSort === "delta_desc") return b.delta - a.delta;
      if (stockSort === "delta_asc") return a.delta - b.delta;
      return (b.change_pct ?? -Infinity) - (a.change_pct ?? -Infinity);
    });
    return arr;
  }, [stockRows, search, stockFilter, stockSort]);

  const filteredPrices = useMemo(() => {
    let arr = [...priceRows];
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) =>
        (r.name_ar || "").toLowerCase().includes(q) ||
        (r.part_number || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.erp_item_code || "").toLowerCase().includes(q)
      );
    }
    if (priceFilter === "up") arr = arr.filter((r) => r.new_price > r.old_price);
    else if (priceFilter === "down") arr = arr.filter((r) => r.new_price < r.old_price);
    return arr;
  }, [priceRows, search, priceFilter]);

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
        r.old_qty, r.new_qty, r.delta, r.change_pct ?? "",
      ]),
      ["اسم الصنف", "بارت نمبر", "كود الصنف", "كانت", "بقت", "التغيير", "نسبة %"],
    );
  };

  const exportPrices = () => {
    downloadCSV(
      `price-report-${range}-${todayStr()}.csv`,
      filteredPrices.map((r) => [
        r.name_ar || "", r.part_number || "", r.erp_item_code || r.sku || "",
        r.old_price, r.new_price, r.change_percentage,
        new Date(r.created_at).toLocaleString("ar-EG"),
      ]),
      ["اسم الصنف", "بارت نمبر", "كود الصنف", "السعر القديم", "السعر الجديد", "نسبة %", "وقت التغيير"],
    );
  };

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

  return (
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
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {[
              { l: "أصناف اتغيّر رصيدها", v: stockKpi.changedCount, c: "text-primary", i: Package },
              { l: "زاد رصيدها", v: stockKpi.increasedCount, c: "text-emerald-600", i: TrendingUp },
              { l: "نقص رصيدها", v: stockKpi.decreasedCount, c: "text-amber-600", i: TrendingDown },
              { l: "وصلت بعد نفاد", v: stockKpi.newlyIn, c: "text-emerald-600", i: Sparkles },
              { l: "نفدت", v: stockKpi.wentOut, c: "text-red-600", i: ArrowDownRight },
              { l: "إجمالي قطع زادت", v: fmtNum(stockKpi.totalAdded), c: "text-emerald-600", i: ArrowUpRight },
              { l: "إجمالي قطع باعت", v: fmtNum(stockKpi.totalRemoved), c: "text-amber-600", i: ArrowDownRight },
            ].map((k) => (
              <Card key={k.l} className="p-2.5">
                <k.i className={`w-3.5 h-3.5 ${k.c} mb-1`} />
                <p className="text-[10px] text-muted-foreground leading-tight">{k.l}</p>
                <p className="text-base font-bold tabular-nums">{k.v}</p>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو البارت نمبر أو الكود..." className="pr-9 h-9" />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                  <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التغييرات</SelectItem>
                    <SelectItem value="increased">زيادة فقط</SelectItem>
                    <SelectItem value="decreased">نقص فقط</SelectItem>
                    <SelectItem value="zero_to_in">وصل بعد نفاد</SelectItem>
                    <SelectItem value="in_to_zero">نفد بالكامل</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stockSort} onValueChange={(v) => setStockSort(v as any)}>
                  <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abs_delta">الأكثر تغيّراً</SelectItem>
                    <SelectItem value="delta_desc">الأكثر زيادة</SelectItem>
                    <SelectItem value="delta_asc">الأكثر نقصاً</SelectItem>
                    <SelectItem value="pct_desc">أعلى نسبة %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" onClick={loadStock} disabled={stockLoading} className="gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${stockLoading ? "animate-spin" : ""}`} /> تحديث
              </Button>
              <Button size="sm" variant="outline" onClick={exportStock} disabled={!filteredStock.length} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> تصدير CSV
              </Button>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            {/* Header (desktop) */}
            <div className="hidden sm:grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_100px_90px_90px_100px_100px] gap-2 px-4 py-2.5 text-[11px] font-bold text-muted-foreground bg-muted/40 border-b">
              <div className="text-right">اسم الصنف</div>
              <div>بارت نمبر</div>
              <div className="text-center">الكود</div>
              <div className="text-center">كانت</div>
              <div className="text-center">بقت</div>
              <div className="text-center">التغيير</div>
              <div className="text-center">النسبة</div>
            </div>

            {stockLoading ? (
              <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />جارٍ التحميل...</div>
            ) : filteredStock.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto opacity-40 mb-2" />
                لا توجد تغييرات في هذا النطاق
              </div>
            ) : (
              <div className="divide-y max-h-[60vh] overflow-y-auto">
                {filteredStock.map((r) => {
                  const positive = r.delta > 0;
                  const newlyIn = r.old_qty === 0 && r.new_qty > 0;
                  const out = r.old_qty > 0 && r.new_qty === 0;
                  return (
                    <div key={r.product_id} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_100px_90px_90px_100px_100px] gap-2 px-4 py-2.5 items-center text-sm hover:bg-muted/30 transition-colors">
                      <div className="col-span-2 sm:col-span-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{r.name_ar}</p>
                          {newlyIn && <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">🎉 وصل بعد نفاد</Badge>}
                          {out && <Badge variant="destructive" className="text-[10px]">⚠️ نفد</Badge>}
                        </div>
                      </div>
                      <div className="font-mono text-xs text-indigo-700 truncate">{r.part_number || "—"}</div>
                      <div className="text-center font-mono text-xs text-muted-foreground">{r.erp_item_code || r.sku || "—"}</div>
                      <div className="text-center tabular-nums">{r.old_qty}</div>
                      <div className="text-center font-bold tabular-nums">{r.new_qty}</div>
                      <div className={`text-center font-bold tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}>
                        {positive ? "+" : ""}{r.delta}
                      </div>
                      <div className={`text-center text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
                        {fmtPct(r.change_pct)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
              <span>عرض <strong className="text-foreground">{filteredStock.length}</strong> من {stockRows.length}</span>
              <span>الفترة: {getRange(range).label}</span>
            </div>
          </Card>
        </TabsContent>

        {/* ============================ PRICES ============================ */}
        <TabsContent value="prices" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {[
              { l: "إجمالي تغييرات", v: priceKpi.total, c: "text-primary", i: BarChart3 },
              { l: "زادت أسعار", v: priceKpi.upCount, c: "text-red-600", i: TrendingUp },
              { l: "نقصت أسعار", v: priceKpi.downCount, c: "text-emerald-600", i: TrendingDown },
              { l: "متوسط الزيادة", v: fmtPct(priceKpi.avgUp), c: "text-red-600", i: ArrowUpRight },
              { l: "متوسط النقص", v: fmtPct(priceKpi.avgDown), c: "text-emerald-600", i: ArrowDownRight },
              { l: "أعلى زيادة", v: fmtPct(priceKpi.maxUp), c: "text-red-600", i: ArrowUpRight },
              { l: "أعلى نقص", v: fmtPct(priceKpi.maxDown), c: "text-emerald-600", i: ArrowDownRight },
            ].map((k) => (
              <Card key={k.l} className="p-2.5">
                <k.i className={`w-3.5 h-3.5 ${k.c} mb-1`} />
                <p className="text-[10px] text-muted-foreground leading-tight">{k.l}</p>
                <p className="text-base font-bold tabular-nums">{k.v}</p>
              </Card>
            ))}
          </div>

          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو البارت نمبر أو الكود..." className="pr-9 h-9" />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={priceFilter} onValueChange={(v) => setPriceFilter(v as PriceFilter)}>
                  <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التغييرات</SelectItem>
                    <SelectItem value="up">زيادة فقط</SelectItem>
                    <SelectItem value="down">نقص فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" onClick={loadPrices} disabled={priceLoading} className="gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${priceLoading ? "animate-spin" : ""}`} /> تحديث
              </Button>
              <Button size="sm" variant="outline" onClick={exportPrices} disabled={!filteredPrices.length} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> تصدير CSV
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="hidden sm:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_100px_110px_110px_100px_120px] gap-2 px-4 py-2.5 text-[11px] font-bold text-muted-foreground bg-muted/40 border-b">
              <div className="text-right">اسم الصنف</div>
              <div>بارت نمبر</div>
              <div className="text-center">الكود</div>
              <div className="text-center">كان</div>
              <div className="text-center">بقى</div>
              <div className="text-center">النسبة</div>
              <div className="text-center">الوقت</div>
            </div>

            {priceLoading ? (
              <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />جارٍ التحميل...</div>
            ) : filteredPrices.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto opacity-40 mb-2" />
                لا توجد تغييرات أسعار في هذا النطاق
              </div>
            ) : (
              <div className="divide-y max-h-[60vh] overflow-y-auto">
                {filteredPrices.map((r) => {
                  const up = r.new_price > r.old_price;
                  return (
                    <div key={r.id} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_100px_110px_110px_100px_120px] gap-2 px-4 py-2.5 items-center text-sm hover:bg-muted/30 transition-colors">
                      <div className="col-span-2 sm:col-span-1 min-w-0">
                        <p className="font-semibold truncate">{r.name_ar || "—"}</p>
                      </div>
                      <div className="font-mono text-xs text-indigo-700 truncate">{r.part_number || "—"}</div>
                      <div className="text-center font-mono text-xs text-muted-foreground">{r.erp_item_code || r.sku || "—"}</div>
                      <div className="text-center tabular-nums text-muted-foreground">{fmtMoney(r.old_price)}</div>
                      <div className="text-center font-bold tabular-nums">{fmtMoney(r.new_price)}</div>
                      <div className={`text-center text-xs font-bold ${up ? "text-red-600" : "text-emerald-600"}`}>
                        {up ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
                        {" "}{r.change_percentage > 0 ? "+" : ""}{r.change_percentage.toFixed(1)}%
                      </div>
                      <div className="text-center text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
              <span>عرض <strong className="text-foreground">{filteredPrices.length}</strong> من {priceRows.length}</span>
              <span>الفترة: {getRange(range).label}</span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
