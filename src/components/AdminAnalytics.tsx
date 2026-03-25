import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, ShoppingBag, Users, Package, DollarSign, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "#f59e0b",
  "#10b981",
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
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
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
        const [y, m] = key.split("-");
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
      .slice(0, 10)
      .map(([name, val]) => ({ name: name.length > 30 ? name.slice(0, 30) + "..." : name, ...val }));

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
        wholesale_tier1: "جملة درجة أولى",
        wholesale_tier2: "جملة درجة ثانية",
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-lg font-bold text-foreground">{kpis.totalRevenue.toLocaleString("ar-EG")} <span className="text-xs font-normal">ج.م</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
              <p className="text-lg font-bold text-foreground">{kpis.totalOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">التجار النشطين</p>
              <p className="text-lg font-bold text-foreground">{kpis.totalDealers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10">
              <Package className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المنتجات النشطة</p>
              <p className="text-lg font-bold text-foreground">{kpis.totalProducts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10">
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">متوسط قيمة الطلب</p>
              <p className="text-lg font-bold text-foreground">{Math.round(kpis.avgOrderValue).toLocaleString("ar-EG")} <span className="text-xs font-normal">ج.م</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-primary" />
            المبيعات الشهرية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlySales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات كافية</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlySales}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, direction: "rtl" }}
                  formatter={(value: number) => [`${value.toLocaleString("ar-EG")} ج.م`, "الإيرادات"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-primary" />
              أكثر المنتجات طلباً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(350, topProducts.length * 40)}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, direction: "rtl" }}
                    formatter={(value: number, name: string) => [
                      name === "quantity" ? `${value} قطعة` : `${value.toLocaleString("ar-EG")} ج.م`,
                      name === "quantity" ? "الكمية" : "الإيرادات"
                    ]}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Dealer & Status Distribution */}
        <div className="space-y-6">
          {/* Dealer Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" />
                توزيع التجار حسب الفئة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dealerDist.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">لا يوجد تجار بعد</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dealerDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {dealerDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, direction: "rtl" }}
                      formatter={(value: number) => [`${value} تاجر`, "العدد"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Order Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="w-5 h-5 text-primary" />
                توزيع حالات الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusDist.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">لا توجد طلبات</p>
              ) : (
                <div className="space-y-2">
                  {statusDist.map((item, i) => {
                    const total = statusDist.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-foreground flex-1">{item.name}</span>
                        <span className="text-sm font-bold text-foreground">{item.value}</span>
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
