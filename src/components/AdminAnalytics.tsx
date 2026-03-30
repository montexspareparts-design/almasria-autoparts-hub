import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, DollarSign, ShoppingBag, Users, Package, TrendingUp, BarChart3, PieChart as PieIcon, ListOrdered, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";

const COLORS = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [monthlySales, setMonthlySales] = useState<{ month: string; revenue: number; orders: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [dealerDist, setDealerDist] = useState<{ name: string; value: number }[]>([]);
  const [statusDist, setStatusDist] = useState<{ name: string; value: number }[]>([]);
  const [kpis, setKpis] = useState({ totalRevenue: 0, totalOrders: 0, totalDealers: 0, totalProducts: 0, avgOrderValue: 0 });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchMonthlySales(),
      fetchTopProducts(),
      fetchDealerDistribution(),
      fetchKPIs(),
    ]);
    setLoading(false);
  };

  const fetchMonthlySales = async () => {
    const { data } = await supabase
      .from("orders")
      .select("created_at, total_amount, status")
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (!data) return;

    const monthMap = new Map<string, { revenue: number; orders: number }>();
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    data.forEach(order => {
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthMap.get(key) || { revenue: 0, orders: 0 };
      monthMap.set(key, {
        revenue: existing.revenue + Number(order.total_amount),
        orders: existing.orders + 1,
      });
    });

    const sorted = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, val]) => {
        const [, m] = key.split("-");
        return { month: `${monthNames[parseInt(m) - 1]}`, ...val };
      });

    setMonthlySales(sorted);
  };

  const fetchTopProducts = async () => {
    const { data } = await supabase
      .from("order_items")
      .select("quantity, total_price, product:products(name_ar)");

    if (!data) return;

    const productMap = new Map<string, { quantity: number; revenue: number }>();
    data.forEach((item: any) => {
      const name = item.product?.name_ar || "غير معروف";
      const existing = productMap.get(name) || { quantity: 0, revenue: 0 };
      productMap.set(name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + Number(item.total_price),
      });
    });

    const sorted = [...productMap.entries()]
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .slice(0, 8)
      .map(([name, val]) => ({ name: name.length > 25 ? name.slice(0, 25) + "…" : name, ...val }));

    setTopProducts(sorted);
  };

  const fetchDealerDistribution = async () => {
    const { data: dealers } = await supabase
      .from("dealer_accounts")
      .select("tier")
      .eq("is_active", true);

    const { data: orders } = await supabase
      .from("orders")
      .select("status");

    if (dealers) {
      const tierLabels: Record<string, string> = {
        wholesale_tier1: "جملة أولى",
        wholesale_tier2: "جملة ثانية",
        corporate: "شركات",
        retail: "قطاعي",
      };
      const tierMap = new Map<string, number>();
      dealers.forEach(d => {
        const label = tierLabels[d.tier] || d.tier;
        tierMap.set(label, (tierMap.get(label) || 0) + 1);
      });
      setDealerDist([...tierMap.entries()].map(([name, value]) => ({ name, value })));
    }

    if (orders) {
      const statusLabels: Record<string, string> = {
        pending: "قيد الانتظار",
        confirmed: "تم التأكيد",
        processing: "جاري التجهيز",
        shipped: "تم الشحن",
        delivered: "تم التسليم",
        cancelled: "ملغي",
        pending_approval: "بانتظار الموافقة",
      };
      const statusMap = new Map<string, number>();
      orders.forEach(o => {
        const label = statusLabels[o.status] || o.status;
        statusMap.set(label, (statusMap.get(label) || 0) + 1);
      });
      setStatusDist([...statusMap.entries()].map(([name, value]) => ({ name, value })));
    }
  };

  const fetchKPIs = async () => {
    const [ordersRes, dealersRes, productsRes] = await Promise.all([
      supabase.from("orders").select("total_amount, status"),
      supabase.from("dealer_accounts").select("id").eq("is_active", true),
      supabase.from("products").select("id").eq("is_active", true),
    ]);

    const activeOrders = (ordersRes.data || []).filter(o => o.status !== "cancelled");
    const totalRevenue = activeOrders.reduce((s, o) => s + Number(o.total_amount), 0);

    setKpis({
      totalRevenue,
      totalOrders: ordersRes.data?.length || 0,
      totalDealers: dealersRes.data?.length || 0,
      totalProducts: productsRes.data?.length || 0,
      avgOrderValue: activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل التحليلات...</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "إجمالي الإيرادات",
      value: `${kpis.totalRevenue.toLocaleString("ar-EG")}`,
      suffix: "ج.م",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-900/50",
    },
    {
      label: "إجمالي الطلبات",
      value: kpis.totalOrders.toLocaleString("ar-EG"),
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-900/50",
    },
    {
      label: "التجار النشطين",
      value: kpis.totalDealers.toLocaleString("ar-EG"),
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      borderColor: "border-violet-200 dark:border-violet-900/50",
    },
    {
      label: "المنتجات النشطة",
      value: kpis.totalProducts.toLocaleString("ar-EG"),
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      borderColor: "border-amber-200 dark:border-amber-900/50",
    },
    {
      label: "متوسط قيمة الطلب",
      value: `${Math.round(kpis.avgOrderValue).toLocaleString("ar-EG")}`,
      suffix: "ج.م",
      icon: TrendingUp,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      borderColor: "border-rose-200 dark:border-rose-900/50",
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-3" dir="rtl">
        <p className="text-sm font-bold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground">
            {p.name === "revenue" ? "الإيرادات" : p.name === "orders" ? "الطلبات" : p.name}:{" "}
            <span className="font-bold text-foreground">
              {typeof p.value === "number" ? p.value.toLocaleString("ar-EG") : p.value}
              {p.name === "revenue" ? " ج.م" : p.name === "quantity" ? " قطعة" : ""}
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`relative overflow-hidden rounded-2xl border ${kpi.borderColor} ${kpi.bg} p-5 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-black/20 shadow-sm`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} strokeWidth={2} />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground tracking-tight leading-none mb-1">
                {kpi.value}
                {kpi.suffix && <span className="text-xs font-medium text-muted-foreground mr-1">{kpi.suffix}</span>}
              </p>
              <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly Sales Chart */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">المبيعات الشهرية</h3>
            <p className="text-xs text-muted-foreground">إيرادات آخر 12 شهر</p>
          </div>
        </div>
        {monthlySales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">لا توجد بيانات كافية</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#dc2626"
                strokeWidth={2.5}
                fill="url(#revenueGrad)"
                dot={{ r: 4, fill: "#dc2626", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: "#dc2626", strokeWidth: 3, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <ListOrdered className="w-5 h-5 text-amber-600" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">أكثر المنتجات طلباً</h3>
              <p className="text-xs text-muted-foreground">أعلى 8 منتجات مبيعاً</p>
            </div>
          </div>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">لا توجد بيانات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, i) => {
                const maxQty = topProducts[0]?.quantity || 1;
                const pct = (product.quantity / maxQty) * 100;
                return (
                  <div key={product.name} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-xs font-black text-muted-foreground w-5 text-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate" title={product.name}>
                          {product.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-foreground">{product.quantity} قطعة</span>
                        <span className="text-[11px] text-muted-foreground">{product.revenue.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mr-7">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Dealer & Status */}
        <div className="space-y-6">
          {/* Dealer Tier Distribution */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <PieIcon className="w-5 h-5 text-violet-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">توزيع التجار</h3>
                <p className="text-xs text-muted-foreground">حسب الفئة</p>
              </div>
            </div>
            {dealerDist.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">لا يوجد تجار بعد</p>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="w-36 h-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dealerDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={62}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {dealerDist.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {dealerDist.map((item, i) => {
                    const total = dealerDist.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium text-foreground flex-1">{item.name}</span>
                        <span className="text-sm font-black text-foreground">{item.value}</span>
                        <span className="text-[11px] text-muted-foreground w-10 text-left">({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Order Status Distribution */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <ShoppingBag className="w-5 h-5 text-blue-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">حالات الطلبات</h3>
                <p className="text-xs text-muted-foreground">توزيع جميع الطلبات</p>
              </div>
            </div>
            {statusDist.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">لا توجد طلبات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statusDist.map((item, i) => {
                  const total = statusDist.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium text-foreground flex-1">{item.name}</span>
                      <span className="text-sm font-black text-foreground tabular-nums">{item.value}</span>
                      <div className="w-28 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
