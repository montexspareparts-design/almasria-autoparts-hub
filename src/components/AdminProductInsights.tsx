import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Search, Package, ShoppingBag, Users, Store,
  User, Phone, MessageCircle, TrendingUp,
} from "lucide-react";

const COLORS = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

type Tab = "dealers" | "retail";
type Period = "7" | "30" | "all";

interface ProductEntry {
  name: string;
  quantity: number;
  revenue: number;
}

interface SearchEntry {
  query: string;
  count: number;
  users: { name: string; phone: string | null }[];
}

const AdminProductInsights = () => {
  const [tab, setTab] = useState<Tab>("dealers");
  const [period, setPeriod] = useState<Period>("all");
  const [loading, setLoading] = useState(true);

  const [dealerProducts, setDealerProducts] = useState<ProductEntry[]>([]);
  const [retailProducts, setRetailProducts] = useState<ProductEntry[]>([]);
  const [dealerSearches, setDealerSearches] = useState<SearchEntry[]>([]);
  const [retailSearches, setRetailSearches] = useState<SearchEntry[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchSearches();
  }, [period]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchSearches()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const [ordersRes, itemsRes, productsRes, dealersRes] = await Promise.all([
      supabase.from("orders").select("id, user_id, status").neq("status", "cancelled"),
      supabase.from("order_items").select("order_id, product_id, quantity, total_price"),
      supabase.from("products").select("id, name_ar"),
      supabase.from("dealer_accounts").select("user_id").eq("is_active", true),
    ]);

    const orders = ordersRes.data || [];
    const items = itemsRes.data || [];
    const products = productsRes.data || [];
    const dealers = dealersRes.data || [];

    const dealerUserIds = new Set(dealers.map(d => d.user_id));
    const productNames = new Map(products.map(p => [p.id, p.name_ar]));
    const orderUserMap = new Map(orders.map(o => [o.id, o.user_id]));

    const buildTop = (filterFn: (userId: string) => boolean) => {
      const map = new Map<string, { quantity: number; revenue: number }>();
      items.forEach((item: any) => {
        const userId = orderUserMap.get(item.order_id);
        if (!userId || !filterFn(userId)) return;
        const name = productNames.get(item.product_id) || "غير معروف";
        const existing = map.get(name) || { quantity: 0, revenue: 0 };
        map.set(name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.total_price),
        });
      });
      return [...map.entries()]
        .sort(([, a], [, b]) => b.quantity - a.quantity)
        .slice(0, 10)
        .map(([name, val]) => ({
          name: name.length > 30 ? name.slice(0, 30) + "…" : name,
          ...val,
        }));
    };

    setDealerProducts(buildTop(uid => dealerUserIds.has(uid)));
    setRetailProducts(buildTop(uid => !dealerUserIds.has(uid)));
  };

  const fetchSearches = async () => {
    let query = supabase.from("customer_search_logs").select("search_query, user_id, created_at");
    if (period !== "all") {
      const d = new Date();
      d.setDate(d.getDate() - Number(period));
      query = query.gte("created_at", d.toISOString());
    }

    const [searchRes, profilesRes, dealersRes] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id, full_name, phone"),
      supabase.from("dealer_accounts").select("user_id").eq("is_active", true),
    ]);

    const logs = searchRes.data || [];
    const profiles = profilesRes.data || [];
    const dealers = dealersRes.data || [];

    const dealerUserIds = new Set(dealers.map(d => d.user_id));
    const profileMap = new Map(profiles.map(p => [p.user_id, { name: p.full_name || "زائر", phone: p.phone }]));

    const buildSearchTop = (filterFn: (userId: string | null) => boolean) => {
      const map = new Map<string, { count: number; users: Map<string, { name: string; phone: string | null }> }>();
      logs.forEach((log: any) => {
        const q = log.search_query?.trim().toLowerCase();
        if (!q) return;
        if (!filterFn(log.user_id)) return;
        const existing = map.get(q) || { count: 0, users: new Map() };
        existing.count += 1;
        if (log.user_id) {
          const profile = profileMap.get(log.user_id);
          if (profile) {
            existing.users.set(log.user_id, profile);
          }
        }
        map.set(q, existing);
      });
      return [...map.entries()]
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([query, val]) => ({
          query,
          count: val.count,
          users: [...val.users.values()].slice(0, 3),
        }));
    };

    setDealerSearches(buildSearchTop(uid => uid !== null && dealerUserIds.has(uid)));
    setRetailSearches(buildSearchTop(uid => uid === null || !dealerUserIds.has(uid)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const topProducts = tab === "dealers" ? dealerProducts : retailProducts;
  const topSearches = tab === "dealers" ? dealerSearches : retailSearches;

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const formatted = cleaned.startsWith("0") ? "2" + cleaned : cleaned.startsWith("2") ? cleaned : "2" + cleaned;
    window.open(`https://wa.me/${formatted}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-muted/50 rounded-2xl p-1.5 w-fit">
        <button
          onClick={() => setTab("dealers")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "dealers"
              ? "bg-card text-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Store className="w-4 h-4" />
          تجار الجملة
        </button>
        <button
          onClick={() => setTab("retail")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "retail"
              ? "bg-card text-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-4 h-4" />
          عملاء القطاعي
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Ordered Products */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2.5 rounded-xl ${tab === "dealers" ? "bg-blue-500/10" : "bg-emerald-500/10"}`}>
              <ShoppingBag className={`w-5 h-5 ${tab === "dealers" ? "text-blue-600" : "text-emerald-600"}`} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">أكثر الأصناف طلباً</h3>
              <p className="text-xs text-muted-foreground">
                {tab === "dealers" ? "طلبات تجار الجملة" : "طلبات عملاء القطاعي"}
              </p>
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
                        <span className="text-[11px] text-muted-foreground">
                          {product.revenue.toLocaleString("ar-EG")} ج.م
                        </span>
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

        {/* Top Searched Products */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${tab === "dealers" ? "bg-violet-500/10" : "bg-cyan-500/10"}`}>
                <Search className={`w-5 h-5 ${tab === "dealers" ? "text-violet-600" : "text-cyan-600"}`} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">أكثر الأصناف بحثاً</h3>
                <p className="text-xs text-muted-foreground">
                  {tab === "dealers" ? "بحث تجار الجملة" : "بحث عملاء القطاعي"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              {([["7", "7 أيام"], ["30", "30 يوم"], ["all", "الكل"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPeriod(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === val
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {topSearches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">لا توجد بيانات بحث</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topSearches.map((item, i) => {
                const maxCount = topSearches[0]?.count || 1;
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={item.query} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-muted-foreground w-5 text-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-foreground truncate">{item.query}</span>
                          <span className="text-xs font-bold text-muted-foreground shrink-0 mr-2">
                            {item.count} مرة
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              tab === "dealers" ? "bg-violet-500" : "bg-cyan-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Users who searched */}
                    {item.users.length > 0 && (
                      <div className="mr-8 space-y-1.5">
                        {item.users.map((u, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg px-3 py-2"
                          >
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground truncate flex-1">{u.name}</span>
                            {u.phone && (
                              <>
                                <span className="text-muted-foreground direction-ltr">{u.phone}</span>
                                <button
                                  onClick={() => openWhatsApp(u.phone!)}
                                  className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                  title="تواصل واتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProductInsights;
