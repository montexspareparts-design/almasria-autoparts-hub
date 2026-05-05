/**
 * ProductTurnoverAnalysis — تحليل سحب الأصناف ومعدل الدوران
 * يحسب من delivered orders + dealer_price_views + products.stock_quantity:
 *  - سرعة البيع (Velocity) لكل صنف خلال آخر 30/90 يوم
 *  - معدل الدوران (Turnover) = total_sold / avg_stock
 *  - أيام التغطية (Days of Supply) = current_stock / daily_velocity
 *  - مؤشر الطلب (Demand Index) = views + سحوبات
 *  - تصنيفات: Hot / Slow / Dead Stock / Reorder Now
 *  - توصيات ذكية لكل صنف
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle, Box, Calendar, Eye, Flame, Loader2, Package,
  RefreshCw, Search, ShoppingCart, Snowflake, Sparkles, TrendingUp, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductDetailAnalytics } from "./ProductDetailAnalytics";

type WindowDays = 30 | 60 | 90;
type CategoryKey = "all" | "hot" | "steady" | "slow" | "dead" | "reorder" | "demand_no_stock";

interface Row {
  product_id: string | null;
  erp_id: string;
  name_ar: string;
  sku: string | null;
  part_number: string | null;
  erp_item_code: string | null;
  brand: string | null;
  current_stock: number;
  retail_price: number | null;
  wholesale_price: number | null;
  units_sold: number;
  orders_count: number;
  unique_buyers: number;
  views_count: number;
  daily_velocity: number;
  days_of_supply: number | null;
  turnover: number;
  in_website: boolean;
  category: Exclude<CategoryKey, "all">;
  recommendation: string;
  recIcon: string;
  recTone: string;
}

const fmtNum = (n: number) => n.toLocaleString("ar-EG");
const fmtDays = (d: number | null) => d == null ? "∞" : d > 999 ? "999+" : d.toFixed(0);

const BRAND_LABEL: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  denso: "DENSO",
  aisin: "AISIN",
  mtx_aftermarket: "MTX",
};

function classify(units_sold: number, current_stock: number, views: number, days_of_supply: number | null): { cat: Row["category"]; rec: string; icon: string; tone: string } {
  // No demand at all
  if (units_sold === 0 && views === 0 && current_stock > 0) {
    return { cat: "dead", rec: "صنف راكد بلا طلب — راجع قرار الاحتفاظ به أو اعمل عرض تخفيض", icon: "❄️", tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" };
  }
  // Demand exists but no stock
  if (current_stock === 0 && (units_sold > 0 || views >= 3)) {
    return { cat: "demand_no_stock", rec: "في طلب وأنت بدون رصيد — اعمل أوردر شراء فوري من الفيصل", icon: "🚨", tone: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40" };
  }
  // Reorder soon
  if (days_of_supply != null && days_of_supply <= 14 && units_sold > 0) {
    return { cat: "reorder", rec: `الرصيد هيخلص في ${fmtDays(days_of_supply)} يوم — ابدأ توفير كمية جديدة دلوقتي`, icon: "⚡", tone: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40" };
  }
  // Hot mover
  if (units_sold >= 10) {
    return { cat: "hot", rec: "صنف ساخن — حافظ على رصيد كافي وفكر في تكبير الكمية", icon: "🔥", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40" };
  }
  // Slow mover (low sales but has stock)
  if (units_sold <= 2 && current_stock >= 5) {
    return { cat: "slow", rec: "حركة بطيئة — جرب حملة على واتساب أو عرض bundle", icon: "🐢", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40" };
  }
  // Steady
  return { cat: "steady", rec: "حركة منتظمة — استمر في المتابعة", icon: "✅", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40" };
}

export const ProductTurnoverAnalysis = () => {
  const { toast } = useToast();
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [sort, setSort] = useState<"velocity" | "turnover" | "stock_low" | "stock_high" | "views">("velocity");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const fromDate = new Date(Date.now() - windowDays * 86400_000).toISOString();

      // 1) ERP Faisal catalog (المصدر الأساسي للأصناف والرصيد)
      const erpAll: any[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("erp_full_catalog_cache")
          .select("erp_id, name, qty, retail_price, wholesale_price, part_number")
          .order("erp_id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        erpAll.push(...data);
        if (data.length < PAGE) break;
      }
      const erpMap = new Map<string, any>(erpAll.map((e) => [String(e.erp_id), e]));

      // 2) Website products (للربط بالـ id والـ brand فقط — مش مصدر الرصيد)
      const { data: websiteProducts } = await supabase
        .from("products")
        .select("id, name_ar, sku, part_number, erp_item_code, brand")
        .eq("is_active", true);
      const productByErpId = new Map<string, any>();
      const productByPid = new Map<string, any>();
      (websiteProducts || []).forEach((p) => {
        productByPid.set(p.id, p);
        const key = String(p.erp_item_code || p.sku || "").trim();
        if (key) productByErpId.set(key, p);
      });

      // 3) Delivered orders within window
      const { data: deliveredOrders, error: oErr } = await supabase
        .from("orders")
        .select("id, user_id, created_at, status")
        .eq("status", "delivered")
        .gte("created_at", fromDate);
      if (oErr) throw oErr;
      const orderUserMap = new Map<string, string>((deliveredOrders || []).map((o) => [o.id, o.user_id]));
      const orderIds = Array.from(orderUserMap.keys());

      // 4) Order items — sales aggregated by product_id (website)
      const salesByPid = new Map<string, { qty: number; orderIds: Set<string>; users: Set<string> }>();
      if (orderIds.length > 0) {
        for (let i = 0; i < orderIds.length; i += 200) {
          const chunk = orderIds.slice(i, i + 200);
          const { data: items, error: iErr } = await supabase
            .from("order_items")
            .select("product_id, quantity, order_id")
            .in("order_id", chunk);
          if (iErr) throw iErr;
          (items || []).forEach((it: any) => {
            const cur = salesByPid.get(it.product_id) || { qty: 0, orderIds: new Set<string>(), users: new Set<string>() };
            cur.qty += Number(it.quantity || 0);
            cur.orderIds.add(it.order_id);
            const uid = orderUserMap.get(it.order_id);
            if (uid) cur.users.add(uid);
            salesByPid.set(it.product_id, cur);
          });
        }
      }

      // 5) Dealer price views by product_id
      const { data: views, error: vErr } = await supabase
        .from("dealer_price_views")
        .select("product_id")
        .gte("viewed_at", fromDate);
      if (vErr) throw vErr;
      const viewsByPid = new Map<string, number>();
      (views || []).forEach((v: any) => {
        viewsByPid.set(v.product_id, (viewsByPid.get(v.product_id) || 0) + 1);
      });

      // 6) Build rows من كاش الفيصل
      const out: Row[] = [];
      erpMap.forEach((e, erpId) => {
        const websiteProd = productByErpId.get(erpId);
        const inWebsite = !!websiteProd;
        const pid = websiteProd?.id || null;
        const s = pid ? salesByPid.get(pid) : undefined;
        const units_sold = s?.qty || 0;
        const orders_count = s?.orderIds.size || 0;
        const unique_buyers = s?.users.size || 0;
        const views_count = pid ? viewsByPid.get(pid) || 0 : 0;
        const current_stock = Number(e.qty || 0); // من الفيصل
        const daily_velocity = units_sold / windowDays;
        const days_of_supply = daily_velocity > 0 ? current_stock / daily_velocity : null;
        const avg_stock = Math.max(1, current_stock + units_sold / 2);
        const turnover = units_sold / avg_stock;
        const c = classify(units_sold, current_stock, views_count, days_of_supply);
        // أصناف بلا أي إشارة ولا رصيد ولا حتى موجودة في الموقع — تخطَّ
        if (units_sold === 0 && views_count === 0 && current_stock === 0 && !inWebsite) return;
        out.push({
          product_id: pid,
          erp_id: erpId,
          name_ar: websiteProd?.name_ar || e.name,
          sku: websiteProd?.sku || erpId,
          part_number: e.part_number || websiteProd?.part_number || null,
          erp_item_code: websiteProd?.erp_item_code || erpId,
          brand: websiteProd?.brand || null,
          current_stock,
          retail_price: e.retail_price != null ? Number(e.retail_price) : null,
          wholesale_price: e.wholesale_price != null ? Number(e.wholesale_price) : null,
          units_sold,
          orders_count,
          unique_buyers,
          views_count,
          daily_velocity,
          days_of_supply,
          turnover,
          in_website: inWebsite,
          category: c.cat,
          recommendation: c.rec,
          recIcon: c.icon,
          recTone: c.tone,
        });
      });
      setRows(out);
    } catch (e: any) {
      toast({ title: "فشل تحميل التحليل", description: e?.message || "خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [windowDays]);

  const counters = useMemo(() => {
    const c = { hot: 0, steady: 0, slow: 0, dead: 0, reorder: 0, demand_no_stock: 0, total: rows.length };
    rows.forEach((r) => { (c as any)[r.category] += 1; });
    return c;
  }, [rows]);

  const totalUnits = useMemo(() => rows.reduce((s, r) => s + r.units_sold, 0), [rows]);
  const totalOrders = useMemo(() => rows.reduce((s, r) => s + r.orders_count, 0), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = rows;
    if (category !== "all") arr = arr.filter((r) => r.category === category);
    if (q) {
      arr = arr.filter((r) =>
        r.name_ar?.toLowerCase().includes(q) ||
        r.sku?.toLowerCase().includes(q) ||
        r.part_number?.toLowerCase().includes(q) ||
        r.erp_item_code?.toLowerCase().includes(q),
      );
    }
    arr = [...arr].sort((a, b) => {
      switch (sort) {
        case "velocity": return b.daily_velocity - a.daily_velocity;
        case "turnover": return b.turnover - a.turnover;
        case "stock_low": return a.current_stock - b.current_stock;
        case "stock_high": return b.current_stock - a.current_stock;
        case "views": return b.views_count - a.views_count;
      }
    });
    return arr;
  }, [rows, search, category, sort]);

  const KPI_CHIPS: { key: CategoryKey; label: string; icon: any; cls: string; count: number; help: string }[] = [
    { key: "all", label: "الإجمالي", icon: Box, cls: "from-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-300", count: counters.total, help: "كل الأصناف اللي عليها حركة أو طلب" },
    { key: "demand_no_stock", label: "طلب بلا رصيد", icon: AlertTriangle, cls: "from-red-500/10 border-red-500/40 text-red-700 dark:text-red-400", count: counters.demand_no_stock, help: "عملاء سألوا عنه أو طلبوه وأنت رصيدك صفر — أولوية شراء" },
    { key: "reorder", label: "يحتاج إعادة طلب", icon: Zap, cls: "from-orange-500/10 border-orange-500/40 text-orange-700 dark:text-orange-400", count: counters.reorder, help: "أيام التغطية ≤ 14 يوم بناءً على سرعة البيع" },
    { key: "hot", label: "ساخن", icon: Flame, cls: "from-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400", count: counters.hot, help: "بيع ≥ 10 وحدة في الفترة المختارة" },
    { key: "steady", label: "منتظم", icon: TrendingUp, cls: "from-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400", count: counters.steady, help: "حركة بيع ثابتة بدون مشاكل" },
    { key: "slow", label: "بطيء", icon: Snowflake, cls: "from-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400", count: counters.slow, help: "بيع ≤ 2 وحدة مع رصيد ≥ 5 — مرشح للعروض" },
    { key: "dead", label: "راكد", icon: Box, cls: "from-slate-500/10 border-slate-500/40 text-slate-700 dark:text-slate-300", count: counters.dead, help: "بدون بيع وبدون اهتمام طوال الفترة" },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4" dir="rtl">
        {/* Header */}
        <Card className="p-4 sm:p-5 bg-gradient-to-l from-primary/10 to-transparent border-primary/20">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <h2 className="text-xl font-bold text-foreground">تحليل سحب الأصناف ومعدل الدوران</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                رؤية ذكية لكل صنف: سرعة البيع، أيام التغطية، الطلب الكامن، وتوصيات قرار فورية.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v) as WindowDays)}>
                <SelectTrigger className="h-9 w-[160px]">
                  <Calendar className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">آخر 30 يوم</SelectItem>
                  <SelectItem value="60">آخر 60 يوم</SelectItem>
                  <SelectItem value="90">آخر 90 يوم</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={load} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>

          {/* Summary line */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <div className="rounded-lg border border-border/50 bg-card px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-bold">إجمالي قطع مباعة</p>
              <p className="text-xl font-extrabold tabular-nums">{fmtNum(totalUnits)}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-bold">عدد طلبات تحتوي عليها</p>
              <p className="text-xl font-extrabold tabular-nums">{fmtNum(totalOrders)}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-bold">أصناف نشطة في الفترة</p>
              <p className="text-xl font-extrabold tabular-nums">{fmtNum(counters.total)}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-bold">أولوية الشراء (طلب بلا رصيد + إعادة طلب)</p>
              <p className="text-xl font-extrabold tabular-nums text-red-600">{fmtNum(counters.demand_no_stock + counters.reorder)}</p>
            </div>
          </div>
        </Card>

        {/* Category chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {KPI_CHIPS.map((c) => {
            const Icon = c.icon;
            const active = category === c.key;
            return (
              <Tooltip key={c.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCategory(c.key)}
                    className={`text-right rounded-xl border p-2.5 bg-gradient-to-br ${c.cls} transition-all hover:shadow-md ${active ? "ring-2 ring-offset-1 ring-primary/50 scale-[1.02]" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black">{c.label}</span>
                    </div>
                    <p className="text-2xl font-extrabold tabular-nums">{fmtNum(c.count)}</p>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] text-xs">{c.help}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Filters bar */}
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث: اسم الصنف، بارت نمبر، أو كود الصنف"
              className="h-10 pr-9"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="h-10 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="velocity">الأسرع بيعاً</SelectItem>
              <SelectItem value="turnover">أعلى معدل دوران</SelectItem>
              <SelectItem value="stock_low">الأقل رصيداً</SelectItem>
              <SelectItem value="stock_high">الأعلى رصيداً</SelectItem>
              <SelectItem value="views">الأكثر مشاهدة سعر</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground mr-auto">
            ظاهر: <strong className="text-foreground">{filtered.length}</strong> من {rows.length}
          </span>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              جارٍ تحليل البيانات...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto opacity-40 mb-2" />
              لا توجد نتائج للفلتر الحالي
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto divide-y">
              {filtered.slice(0, 200).map((r, idx) => {
                const code = r.erp_item_code || r.sku || "—";
                const stockBarPct = r.days_of_supply == null ? 100 : Math.min(100, (r.days_of_supply / 60) * 100);
                const barColor = r.days_of_supply == null ? "bg-slate-300" : r.days_of_supply <= 14 ? "bg-red-500" : r.days_of_supply <= 30 ? "bg-orange-500" : "bg-emerald-500";
                return (
                  <div key={r.erp_id} onClick={() => r.product_id && setDetailProductId(r.product_id)} title={r.product_id ? "اضغط لعرض تحليل تفصيلي" : "صنف من الفيصل غير معروض في الموقع"} className={`p-3 sm:p-4 transition-colors ${r.product_id ? "hover:bg-primary/5 cursor-pointer" : "opacity-90"} ${idx % 2 ? "bg-muted/10" : ""}`}>
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Name + identifiers */}
                      <div className="col-span-12 md:col-span-5 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="font-semibold text-[14px] leading-relaxed text-right break-words flex-1 min-w-[180px]">
                            {r.name_ar}
                          </p>
                          <Badge variant="outline" className={`text-[9px] font-bold border ${r.recTone}`}>
                            <span className="ml-1">{r.recIcon}</span>
                            {r.category === "hot" && "ساخن"}
                            {r.category === "steady" && "منتظم"}
                            {r.category === "slow" && "بطيء"}
                            {r.category === "dead" && "راكد"}
                            {r.category === "reorder" && "إعادة طلب"}
                            {r.category === "demand_no_stock" && "طلب بلا رصيد"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                          {r.brand && <Badge variant="secondary" className="text-[9px]">{BRAND_LABEL[r.brand] || r.brand}</Badge>}
                          <span className="text-muted-foreground">كود: <span className="font-mono text-foreground">{code}</span></span>
                          {r.part_number && <span className="text-muted-foreground">بارت: <span className="font-mono text-foreground">{r.part_number}</span></span>}
                        </div>
                      </div>

                      {/* Velocity / Stock metrics */}
                      <div className="col-span-12 md:col-span-4 grid grid-cols-4 gap-2">
                        <div className="text-center bg-muted/30 rounded-lg p-1.5">
                          <p className="text-[9px] text-muted-foreground font-bold">مباع</p>
                          <p className="text-sm font-extrabold tabular-nums">{fmtNum(r.units_sold)}</p>
                        </div>
                        <div className="text-center bg-muted/30 rounded-lg p-1.5">
                          <p className="text-[9px] text-muted-foreground font-bold">رصيد</p>
                          <p className={`text-sm font-extrabold tabular-nums ${r.current_stock === 0 ? "text-red-600" : ""}`}>{fmtNum(r.current_stock)}</p>
                        </div>
                        <div className="text-center bg-muted/30 rounded-lg p-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <p className="text-[9px] text-muted-foreground font-bold">يومي</p>
                                <p className="text-sm font-extrabold tabular-nums">{r.daily_velocity.toFixed(2)}</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>متوسط البيع اليومي = إجمالي المباع ÷ {windowDays}</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-center bg-muted/30 rounded-lg p-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <p className="text-[9px] text-muted-foreground font-bold">دوران</p>
                                <p className="text-sm font-extrabold tabular-nums">{r.turnover.toFixed(2)}x</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>معدل الدوران = المباع ÷ متوسط الرصيد. كل ما زاد كل ما الصنف بيلف بسرعة.</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Days of supply bar + recommendation */}
                      <div className="col-span-12 md:col-span-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground font-bold">أيام التغطية</span>
                          <span className="font-extrabold tabular-nums">{fmtDays(r.days_of_supply)} يوم</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${barColor} transition-all`} style={{ width: `${stockBarPct}%` }} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Eye className="w-3 h-3" /> {fmtNum(r.views_count)} مشاهدة سعر
                          {r.unique_buyers > 0 && <><ShoppingCart className="w-3 h-3 mr-1" /> {r.unique_buyers} مشتري</>}
                        </div>
                      </div>

                      {/* Recommendation row */}
                      <div className={`col-span-12 rounded-lg border p-2 text-xs flex items-start gap-2 ${r.recTone}`}>
                        <span className="text-base shrink-0">{r.recIcon}</span>
                        <p className="leading-relaxed">{r.recommendation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length > 200 && (
                <div className="p-3 text-center text-[11px] text-muted-foreground">
                  يظهر أعلى 200 صنف من إجمالي {filtered.length} — استخدم البحث/الفلاتر للتضييق
                </div>
              )}
            </div>
          )}
        </Card>

        <ProductDetailAnalytics
          productId={detailProductId}
          open={!!detailProductId}
          onOpenChange={(v) => !v && setDetailProductId(null)}
        />
      </div>
    </TooltipProvider>
  );
};

export default ProductTurnoverAnalysis;
