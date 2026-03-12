import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  FileText,
  TrendingUp,
  Package,
  Clock,
  Tag,
  ArrowLeft,
  ArrowRight,
  Bell,
  Star,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface OfferProduct {
  id: string;
  name_ar: string;
  name_en: string | null;
  sku: string;
  base_price: number;
  sale_price: number | null;
  image_url: string | null;
}

const statusMap: Record<string, { label_ar: string; label_en: string; color: string }> = {
  pending: { label_ar: "قيد الانتظار", label_en: "Pending", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20" },
  confirmed: { label_ar: "تمت الموافقة", label_en: "Confirmed", color: "bg-blue-500/15 text-blue-600 border-blue-500/20" },
  processing: { label_ar: "جاري التجهيز", label_en: "Processing", color: "bg-primary/15 text-primary border-primary/20" },
  shipped: { label_ar: "تم الشحن", label_en: "Shipped", color: "bg-purple-500/15 text-purple-600 border-purple-500/20" },
  delivered: { label_ar: "تم التسليم", label_en: "Delivered", color: "bg-green-500/15 text-green-600 border-green-500/20" },
  cancelled: { label_ar: "ملغى", label_en: "Cancelled", color: "bg-destructive/15 text-destructive border-destructive/20" },
};

const DealerHomePage = () => {
  const { user, dealerAccount } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const isRTL = lang === "ar";

  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, totalSpent: 0, unreadNotifs: 0 });
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [offers, setOffers] = useState<OfferProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OfferProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    setShowResults(true);
    const q = query.trim();
    const { data } = await supabase
      .from("products")
      .select("id, name_ar, name_en, sku, base_price, sale_price, image_url")
      .eq("is_active", true)
      .or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(8);
    setSearchResults((data as OfferProduct[]) || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [ordersRes, notifsRes, offersRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, total_amount, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
        supabase
          .from("products")
          .select("id, name_ar, name_en, sku, base_price, sale_price, image_url")
          .eq("is_active", true)
          .eq("is_on_sale", true)
          .limit(6),
      ]);

      const orders = ordersRes.data || [];
      setRecentOrders(orders.slice(0, 5));
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === "pending" || o.status === "confirmed").length,
        totalSpent: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        unreadNotifs: notifsRes.count || 0,
      });
      setOffers((offersRes.data as OfferProduct[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Also fetch total orders count separately (all orders, not just last 5)
  useEffect(() => {
    if (!user) return;
    const fetchTotalStats = async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { data: pendingData } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["pending", "confirmed"]);

      const { data: allOrders } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("user_id", user.id);

      setStats((prev) => ({
        ...prev,
        totalOrders: count || 0,
        totalSpent: allOrders?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0,
      }));
    };
    fetchTotalStats();
  }, [user]);

  const tierLabel = dealerAccount?.tier === "wholesale_tier1"
    ? (isRTL ? "تاجر جملة - الدرجة الأولى" : "Wholesale Tier 1")
    : dealerAccount?.tier === "wholesale_tier2"
    ? (isRTL ? "تاجر جملة - الدرجة الثانية" : "Wholesale Tier 2")
    : dealerAccount?.tier === "corporate"
    ? (isRTL ? "شركات" : "Corporate")
    : (isRTL ? "تجزئة" : "Retail");

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const quickActions = [
    { icon: ShoppingCart, label: isRTL ? "اطلب قطع غيار" : "Order Parts", href: "/products", color: "from-primary to-primary/80" },
    { icon: LayoutDashboard, label: isRTL ? "لوحة التحكم" : "Dashboard", href: "/dealer", color: "from-blue-600 to-blue-500" },
    { icon: ClipboardList, label: isRTL ? "طلباتي" : "My Orders", href: "/dealer?tab=orders", color: "from-emerald-600 to-emerald-500" },
    { icon: FileText, label: isRTL ? "كشوفات الأسعار" : "Price Lists", href: "/dealer?tab=prices", color: "from-amber-600 to-amber-500" },
  ];

  const statCards = [
    { icon: Package, label: isRTL ? "إجمالي الطلبات" : "Total Orders", value: stats.totalOrders, color: "text-primary" },
    { icon: Clock, label: isRTL ? "طلبات معلقة" : "Pending Orders", value: stats.pendingOrders, color: "text-amber-500" },
    { icon: TrendingUp, label: isRTL ? "إجمالي المشتريات" : "Total Purchases", value: `${stats.totalSpent.toLocaleString()} ${isRTL ? "ج.م" : "EGP"}`, color: "text-emerald-500" },
    { icon: Bell, label: isRTL ? "إشعارات جديدة" : "New Notifications", value: stats.unreadNotifs, color: "text-blue-500" },
  ];

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Welcome Header */}
      <section className="bg-gradient-to-br from-secondary via-secondary to-secondary/95 border-b border-border/50">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs font-bold px-3 py-1">
                {tierLabel}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground mt-3">
              {isRTL ? "أهلاً بك في بوابة التجار" : "Welcome to Dealer Portal"}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              {isRTL
                ? "يمكنك إدارة طلباتك ومتابعة أسعارك وطلب قطع الغيار بسهولة من هنا"
                : "Manage orders, track prices, and order parts easily from here"}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 md:py-10 space-y-8 md:space-y-12">
        {/* Quick Search */}
        <section className="relative">
          <div className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground ${isRTL ? 'right-4' : 'left-4'}`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by part number or product name..."}
                className={`h-12 rounded-xl border-border/60 bg-card shadow-sm text-sm font-medium ${isRTL ? 'pr-12 pl-10' : 'pl-12 pr-10'} focus-visible:ring-primary/30`}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setShowResults(false); }}
                  className={`absolute top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {showResults && (
              <Card className="absolute z-50 w-full mt-2 border-border/60 shadow-xl overflow-hidden">
                <CardContent className="p-0">
                  {searching ? (
                    <div className="p-4 space-y-2">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      {isRTL ? "لا توجد نتائج" : "No results found"}
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            navigate(`/products?search=${encodeURIComponent(p.sku)}`);
                            setShowResults(false);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-start"
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground truncate">
                              {isRTL ? p.name_ar : (p.name_en || p.name_ar)}
                            </p>
                            <p className="text-xs text-muted-foreground">{p.sku}</p>
                          </div>
                          <span className="text-xs font-bold text-primary whitespace-nowrap">
                            {(p.sale_price || p.base_price).toLocaleString()} {isRTL ? "ج.م" : "EGP"}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
                          setShowResults(false);
                          setSearchQuery("");
                        }}
                        className="w-full p-3 text-center text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                      >
                        {isRTL ? "عرض كل النتائج ←" : "View all results →"}
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link to={action.href}>
                  <Card className="group cursor-pointer border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
                    <CardContent className="p-4 md:p-6 flex flex-col items-center text-center gap-3">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <span className="text-sm md:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {action.label}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-4">
            {isRTL ? "📊 نظرة سريعة" : "📊 Quick Overview"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <Card className="border-border/50">
                  <CardContent className="p-4 md:p-5">
                    {loading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                          <span className="text-xs md:text-sm text-muted-foreground font-medium">{stat.label}</span>
                        </div>
                        <p className={`text-xl md:text-2xl font-black ${stat.color}`}>{stat.value}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Orders */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              {isRTL ? "📦 آخر الطلبات" : "📦 Recent Orders"}
            </h2>
            <Link to="/dealer?tab=orders">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1 text-sm font-semibold">
                {isRTL ? "عرض الكل" : "View All"}
                <ArrowIcon className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">
                  {isRTL ? "لا توجد طلبات بعد" : "No orders yet"}
                </p>
                <Link to="/products">
                  <Button size="sm" className="mt-4 gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    {isRTL ? "اطلب الآن" : "Order Now"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order, i) => {
                const st = statusMap[order.status] || statusMap.pending;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.06 }}
                  >
                    <Card className="border-border/50 hover:border-primary/20 transition-colors">
                      <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <ClipboardList className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              #{order.order_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className={`text-[10px] font-bold border ${st.color}`}>
                            {isRTL ? st.label_ar : st.label_en}
                          </Badge>
                          <span className="text-sm font-bold text-foreground whitespace-nowrap">
                            {order.total_amount.toLocaleString()} {isRTL ? "ج.م" : "EGP"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Exclusive Offers */}
        {offers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-foreground">
                {isRTL ? "🏷️ عروض حصرية" : "🏷️ Exclusive Offers"}
              </h2>
              <Link to="/products">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1 text-sm font-semibold">
                  {isRTL ? "عرض الكل" : "View All"}
                  <ArrowIcon className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {offers.map((product, i) => {
                const discount = product.sale_price && product.base_price
                  ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)
                  : 0;
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                  >
                    <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-md group overflow-hidden">
                      <CardContent className="p-0">
                        <div className="aspect-square bg-muted relative overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={isRTL ? product.name_ar : (product.name_en || product.name_ar)}
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                          )}
                          {discount > 0 && (
                            <Badge className="absolute top-1.5 start-1.5 bg-destructive text-destructive-foreground text-[10px] font-black px-1.5 py-0.5">
                              -{discount}%
                            </Badge>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-foreground line-clamp-2 leading-relaxed mb-1.5">
                            {isRTL ? product.name_ar : (product.name_en || product.name_ar)}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-primary">
                              {(product.sale_price || product.base_price).toLocaleString()} {isRTL ? "ج.م" : "EGP"}
                            </span>
                            {product.sale_price && (
                              <span className="text-[10px] text-muted-foreground line-through">
                                {product.base_price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default DealerHomePage;
