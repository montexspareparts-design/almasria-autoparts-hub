/**
 * ProductDetailAnalytics — صفحة تفاصيل صنف داخل تحليل الدوران
 * يعرض: مبيعات يومية، تاريخ الرصيد، تطور سعر التجار، أعلى المشترين
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, Package, DollarSign, Eye, Users } from "lucide-react";

interface Props {
  productId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ProductInfo {
  id: string;
  name_ar: string;
  sku: string | null;
  part_number: string | null;
  erp_item_code: string | null;
  brand: string | null;
  stock_quantity: number;
  base_price: number | null;
  sale_price: number | null;
}

const fmtNum = (n: number) => n.toLocaleString("ar-EG");
const fmtEgp = (n: number) => `${n.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;
const dayLabel = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
};

export const ProductDetailAnalytics = ({ productId, open, onOpenChange }: Props) => {
  const [days, setDays] = useState<30 | 60 | 90 | 180>(90);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<ProductInfo | null>(null);
  const [salesByDay, setSalesByDay] = useState<{ date: string; units: number; orders: number; revenue: number }[]>([]);
  const [stockHistory, setStockHistory] = useState<{ date: string; stock: number }[]>([]);
  const [priceHistory, setPriceHistory] = useState<{ date: string; avg_price: number; min_price: number; max_price: number }[]>([]);
  const [viewsByDay, setViewsByDay] = useState<{ date: string; views: number }[]>([]);
  const [topBuyers, setTopBuyers] = useState<{ name: string; phone: string | null; qty: number; orders: number }[]>([]);

  useEffect(() => {
    if (!productId || !open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fromDate = new Date(Date.now() - days * 86400_000);
        const fromIso = fromDate.toISOString();
        const fromDateStr = fromIso.slice(0, 10);

        // 1) Product info
        const { data: prod } = await supabase
          .from("products")
          .select("id, name_ar, sku, part_number, erp_item_code, brand, stock_quantity, base_price, tier_price")
          .eq("id", productId)
          .maybeSingle();

        // 2) Delivered orders containing this product
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, quantity, unit_price, total_price")
          .eq("product_id", productId);
        const itemMap = new Map<string, { qty: number; unit_price: number; total: number }>();
        (items || []).forEach((it: any) => {
          itemMap.set(it.order_id, {
            qty: Number(it.quantity || 0),
            unit_price: Number(it.unit_price || 0),
            total: Number(it.total_price || 0),
          });
        });
        const orderIds = Array.from(itemMap.keys());

        const orders: any[] = [];
        for (let i = 0; i < orderIds.length; i += 200) {
          const chunk = orderIds.slice(i, i + 200);
          const { data } = await supabase
            .from("orders")
            .select("id, user_id, created_at, status")
            .in("id", chunk)
            .gte("created_at", fromIso)
            .eq("status", "delivered");
          if (data) orders.push(...data);
        }

        // Group sales by day
        const dayMap = new Map<string, { units: number; orders: number; revenue: number; prices: number[] }>();
        const buyerIds = new Set<string>();
        const buyerStats = new Map<string, { qty: number; orders: number }>();
        orders.forEach((o) => {
          const it = itemMap.get(o.id);
          if (!it) return;
          const dKey = o.created_at.slice(0, 10);
          const cur = dayMap.get(dKey) || { units: 0, orders: 0, revenue: 0, prices: [] };
          cur.units += it.qty;
          cur.orders += 1;
          cur.revenue += it.total;
          if (it.unit_price > 0) cur.prices.push(it.unit_price);
          dayMap.set(dKey, cur);
          buyerIds.add(o.user_id);
          const bs = buyerStats.get(o.user_id) || { qty: 0, orders: 0 };
          bs.qty += it.qty;
          bs.orders += 1;
          buyerStats.set(o.user_id, bs);
        });

        // 3) Stock snapshots
        const { data: snapshots } = await supabase
          .from("product_stock_snapshots")
          .select("snapshot_date, stock_quantity")
          .eq("product_id", productId)
          .gte("snapshot_date", fromDateStr)
          .order("snapshot_date", { ascending: true });

        // 4) Views per day
        const { data: views } = await supabase
          .from("dealer_price_views")
          .select("view_date")
          .eq("product_id", productId)
          .gte("view_date", fromDateStr);
        const viewMap = new Map<string, number>();
        (views || []).forEach((v: any) => {
          viewMap.set(v.view_date, (viewMap.get(v.view_date) || 0) + 1);
        });

        // Build full timeline (every day in range)
        const timeline: string[] = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
          timeline.push(d.toISOString().slice(0, 10));
        }

        const salesArr = timeline.map((d) => {
          const v = dayMap.get(d);
          return { date: d, units: v?.units || 0, orders: v?.orders || 0, revenue: v?.revenue || 0 };
        });

        // Price history: only days with sales (avg unit_price)
        const priceArr = timeline
          .map((d) => {
            const v = dayMap.get(d);
            if (!v || v.prices.length === 0) return null;
            const avg = v.prices.reduce((a, b) => a + b, 0) / v.prices.length;
            return {
              date: d,
              avg_price: Number(avg.toFixed(2)),
              min_price: Math.min(...v.prices),
              max_price: Math.max(...v.prices),
            };
          })
          .filter(Boolean) as any[];

        // Stock history (forward-fill missing days using last known)
        const snapMap = new Map<string, number>((snapshots || []).map((s: any) => [s.snapshot_date, s.stock_quantity]));
        let lastStock = snapshots && snapshots.length > 0 ? snapshots[0].stock_quantity : prod?.stock_quantity ?? 0;
        const stockArr = timeline.map((d) => {
          if (snapMap.has(d)) lastStock = snapMap.get(d)!;
          return { date: d, stock: lastStock };
        });

        const viewsArr = timeline.map((d) => ({ date: d, views: viewMap.get(d) || 0 }));

        // Top buyers names
        const buyerArr: { name: string; phone: string | null; qty: number; orders: number }[] = [];
        if (buyerIds.size > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, phone")
            .in("user_id", Array.from(buyerIds));
          const profMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));
          buyerStats.forEach((stats, uid) => {
            const p = profMap.get(uid);
            buyerArr.push({
              name: p?.full_name || "عميل",
              phone: p?.phone || null,
              qty: stats.qty,
              orders: stats.orders,
            });
          });
          buyerArr.sort((a, b) => b.qty - a.qty);
        }

        if (cancelled) return;
        setInfo(prod as any);
        setSalesByDay(salesArr);
        setStockHistory(stockArr);
        setPriceHistory(priceArr);
        setViewsByDay(viewsArr);
        setTopBuyers(buyerArr.slice(0, 10));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId, open, days]);

  const totals = useMemo(() => {
    const units = salesByDay.reduce((s, d) => s + d.units, 0);
    const orders = salesByDay.reduce((s, d) => s + d.orders, 0);
    const revenue = salesByDay.reduce((s, d) => s + d.revenue, 0);
    const totalViews = viewsByDay.reduce((s, d) => s + d.views, 0);
    const avgPrice = priceHistory.length > 0
      ? priceHistory.reduce((s, p) => s + p.avg_price, 0) / priceHistory.length
      : 0;
    // Trend: compare first half vs second half units
    const half = Math.floor(salesByDay.length / 2);
    const firstHalf = salesByDay.slice(0, half).reduce((s, d) => s + d.units, 0);
    const secondHalf = salesByDay.slice(half).reduce((s, d) => s + d.units, 0);
    const trend = firstHalf === 0 ? (secondHalf > 0 ? 100 : 0) : ((secondHalf - firstHalf) / firstHalf) * 100;
    return { units, orders, revenue, totalViews, avgPrice, trend };
  }, [salesByDay, viewsByDay, priceHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            تفاصيل الصنف وتحليله العميق
          </DialogTitle>
        </DialogHeader>

        {loading || !info ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            جارٍ تحميل التحليل...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header info */}
            <Card className="p-4 bg-gradient-to-l from-primary/5 to-transparent">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[260px]">
                  <h3 className="font-bold text-base text-right">{info.name_ar}</h3>
                  <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                    {info.brand && <Badge variant="secondary">{info.brand}</Badge>}
                    {info.erp_item_code && <Badge variant="outline">كود: {info.erp_item_code}</Badge>}
                    {info.part_number && <Badge variant="outline">بارت: {info.part_number}</Badge>}
                    {info.sku && info.sku !== info.erp_item_code && <Badge variant="outline">SKU: {info.sku}</Badge>}
                  </div>
                </div>
                <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as any)}>
                  <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">آخر 30 يوم</SelectItem>
                    <SelectItem value="60">آخر 60 يوم</SelectItem>
                    <SelectItem value="90">آخر 90 يوم</SelectItem>
                    <SelectItem value="180">آخر 180 يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                <KPI icon={<Package className="w-3.5 h-3.5" />} label="مباع" value={fmtNum(totals.units)} tone="text-emerald-600" />
                <KPI icon={<Users className="w-3.5 h-3.5" />} label="طلبات" value={fmtNum(totals.orders)} tone="text-blue-600" />
                <KPI icon={<DollarSign className="w-3.5 h-3.5" />} label="إيراد" value={fmtEgp(totals.revenue)} tone="text-amber-600" small />
                <KPI icon={<Eye className="w-3.5 h-3.5" />} label="مشاهدة سعر" value={fmtNum(totals.totalViews)} tone="text-violet-600" />
                <KPI
                  icon={totals.trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  label="الاتجاه"
                  value={`${totals.trend >= 0 ? "+" : ""}${totals.trend.toFixed(0)}%`}
                  tone={totals.trend >= 0 ? "text-emerald-600" : "text-red-600"}
                />
              </div>
            </Card>

            {/* Daily Sales Chart */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm">📈 المبيعات اليومية</h4>
                <span className="text-[10px] text-muted-foreground">قطع/يوم خلال آخر {days} يوم</span>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesByDay}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RTooltip
                      labelFormatter={(d) => `يوم ${dayLabel(d as string)}`}
                      formatter={(v: any, name: string) => [v, name === "units" ? "قطع مباعة" : "طلبات"]}
                      contentStyle={{ fontSize: 11, direction: "rtl" }}
                    />
                    <Area type="monotone" dataKey="units" stroke="hsl(var(--primary))" fill="url(#salesGrad)" strokeWidth={2} name="units" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Stock History */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm">📦 تطور الرصيد التاريخي</h4>
                <span className="text-[10px] text-muted-foreground">
                  {stockHistory.length > 0 && `الحالي: ${fmtNum(info.stock_quantity)} قطعة`}
                </span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stockHistory}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RTooltip
                      labelFormatter={(d) => `يوم ${dayLabel(d as string)}`}
                      formatter={(v: any) => [`${fmtNum(v as number)} قطعة`, "الرصيد"]}
                      contentStyle={{ fontSize: 11, direction: "rtl" }}
                    />
                    <Line type="stepAfter" dataKey="stock" stroke="hsl(var(--chart-2, 200 80% 50%))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {stockHistory.every((s) => s.stock === stockHistory[0]?.stock) && (
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  ⚠️ بيانات الرصيد التاريخية محدودة — يبدأ التسجيل من snapshots اليومية الأخيرة
                </p>
              )}
            </Card>

            {/* Price evolution */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm">💰 تطور سعر البيع للتجار</h4>
                <span className="text-[10px] text-muted-foreground">
                  {priceHistory.length > 0 ? `متوسط: ${fmtEgp(totals.avgPrice)}` : "لا توجد مبيعات بعد"}
                </span>
              </div>
              {priceHistory.length === 0 ? (
                <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">
                  لا توجد عمليات بيع لرسم تطور السعر — السعر الحالي: {info.tier_price ? fmtEgp(info.tier_price) : "—"}
                </div>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                      <RTooltip
                        labelFormatter={(d) => `يوم ${dayLabel(d as string)}`}
                        formatter={(v: any, name: string) => [fmtEgp(v as number), name === "avg_price" ? "متوسط" : name === "min_price" ? "أقل" : "أعلى"]}
                        contentStyle={{ fontSize: 11, direction: "rtl" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="avg_price" stroke="hsl(var(--primary))" strokeWidth={2} name="متوسط" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="min_price" stroke="hsl(142 76% 36%)" strokeWidth={1.5} strokeDasharray="4 4" name="أقل" dot={false} />
                      <Line type="monotone" dataKey="max_price" stroke="hsl(0 72% 51%)" strokeWidth={1.5} strokeDasharray="4 4" name="أعلى" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Views per day */}
            {totals.totalViews > 0 && (
              <Card className="p-4">
                <h4 className="font-bold text-sm mb-3">👁️ مشاهدات سعر التجار يومياً</h4>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={viewsByDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <RTooltip
                        labelFormatter={(d) => `يوم ${dayLabel(d as string)}`}
                        formatter={(v: any) => [v, "مشاهدة"]}
                        contentStyle={{ fontSize: 11, direction: "rtl" }}
                      />
                      <Bar dataKey="views" fill="hsl(262 83% 58%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Top buyers */}
            {topBuyers.length > 0 && (
              <Card className="p-4">
                <h4 className="font-bold text-sm mb-3">🏆 أعلى المشترين لهذا الصنف</h4>
                <div className="space-y-1.5">
                  {topBuyers.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-[10px]">
                          {i + 1}
                        </span>
                        <span className="font-semibold">{b.name}</span>
                        {b.phone && <span className="text-muted-foreground font-mono">{b.phone}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{b.orders} طلب</span>
                        <span className="font-extrabold tabular-nums">{fmtNum(b.qty)} قطعة</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const KPI = ({ icon, label, value, tone, small }: { icon: React.ReactNode; label: string; value: string; tone: string; small?: boolean }) => (
  <div className="rounded-lg border border-border/50 bg-card px-3 py-2">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <p className="text-[10px] font-bold">{label}</p>
    </div>
    <p className={`${small ? "text-sm" : "text-lg"} font-extrabold tabular-nums mt-0.5 ${tone}`}>{value}</p>
  </div>
);

export default ProductDetailAnalytics;
