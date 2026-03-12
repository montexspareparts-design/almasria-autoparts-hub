import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  ClipboardList,
  FileText,
  TrendingUp,
  Package,
  Clock,
  Bell,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
  brand?: string;
}

const statusMap: Record<string, { label_ar: string; label_en: string; color: string }> = {
  pending: { label_ar: "قيد الانتظار", label_en: "Pending", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  confirmed: { label_ar: "تمت الموافقة", label_en: "Confirmed", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  processing: { label_ar: "جاري التجهيز", label_en: "Processing", color: "bg-primary/15 text-primary border-primary/30" },
  shipped: { label_ar: "تم الشحن", label_en: "Shipped", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  delivered: { label_ar: "تم التسليم", label_en: "Delivered", color: "bg-green-500/15 text-green-600 border-green-500/30" },
  cancelled: { label_ar: "ملغى", label_en: "Cancelled", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

const brandLabels: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX",
  denso: "DENSO",
  aisin: "AISIN",
};

/* ─── Main Component ─── */

const DealerHomePage = () => {
  const { user, dealerAccount } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isRTL = lang === "ar";

  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, totalSpent: 0, unreadNotifs: 0 });
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [offers, setOffers] = useState<OfferProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [popularProducts, setPopularProducts] = useState<OfferProduct[]>([]);
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
        supabase.from("orders").select("id, order_number, status, total_amount, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url").eq("is_active", true).eq("is_on_sale", true).limit(6),
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

  useEffect(() => {
    if (!user) return;
    const fetchTotalStats = async () => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      const { data: allOrders } = await supabase.from("orders").select("total_amount").eq("user_id", user.id);
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

  const handleAddToQuote = useCallback((product: OfferProduct) => {
    const existing = JSON.parse(sessionStorage.getItem("quote_pending_items") || "[]");
    if (!existing.find((p: any) => p.id === product.id)) {
      existing.push({ id: product.id, sku: product.sku, name_ar: product.name_ar, name_en: product.name_en });
      sessionStorage.setItem("quote_pending_items", JSON.stringify(existing));
    }
    toast({
      title: isRTL ? "✅ تمت الإضافة لعرض السعر" : "✅ Added to Quote",
      description: isRTL
        ? `${product.name_ar} — اذهب لعرض السعر من لوحة التحكم لمعرفة السعر`
        : `${product.name_en || product.name_ar} — Go to Quote Builder to see pricing`,
    });
  }, [isRTL, toast]);

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  const quickActions = [
    { icon: ShoppingCart, label: isRTL ? "اطلب قطع غيار" : "Order Parts", href: "/dealer?tab=quotes", gradient: "from-primary to-primary/70", iconBg: "bg-white/20" },
    { icon: ClipboardList, label: isRTL ? "طلباتي" : "My Orders", href: "/dealer?tab=orders", gradient: "from-secondary-foreground/85 to-secondary-foreground/65", iconBg: "bg-white/15" },
    { icon: FileText, label: isRTL ? "كشوفات الأسعار" : "Price Lists", href: "/dealer?tab=price_lists", gradient: "from-primary/85 to-primary/55", iconBg: "bg-white/20" },
  ];

  const statCards = [
    { icon: Package, label: isRTL ? "إجمالي الطلبات" : "Total Orders", value: stats.totalOrders, color: "text-primary" },
    { icon: Clock, label: isRTL ? "معلقة" : "Pending", value: stats.pendingOrders, color: "text-amber-500" },
    { icon: TrendingUp, label: isRTL ? "المشتريات" : "Purchases", value: `${stats.totalSpent.toLocaleString()} ${isRTL ? "ج.م" : "EGP"}`, color: "text-emerald-500" },
    { icon: Bell, label: isRTL ? "إشعارات" : "Notifications", value: stats.unreadNotifs, color: "text-blue-500" },
  ];

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>

      {/* ─── Compact Welcome + Search ─── */}
      <section className="bg-gradient-to-b from-secondary to-background">
        <div className="container mx-auto px-4 pt-8 pb-6 md:pt-10 md:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-black text-foreground">
                  {isRTL ? "مرحباً بك 👋" : "Welcome 👋"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold border-primary/30 text-primary bg-primary/5 px-2.5 py-0.5 rounded-full">
                  {tierLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isRTL ? "بوابة التجار" : "Dealer Portal"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="relative max-w-xl"
          >
            <div className="relative bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
              <div className="relative flex items-center">
                <Search className={`absolute w-4 h-4 text-muted-foreground/50 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                  placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by part number or name..."}
                  className={`h-11 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 ${isRTL ? 'pr-10 pl-9' : 'pl-10 pr-9'}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setShowResults(false); }}
                    className={`absolute p-1 rounded-full hover:bg-muted transition-colors ${isRTL ? 'left-2.5' : 'right-2.5'}`}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showResults && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 w-full mt-1.5"
                >
                  <Card className="border-border/60 shadow-xl overflow-hidden rounded-xl">
                    <CardContent className="p-0">
                      {searching ? (
                        <div className="p-3 space-y-2">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-6 text-center">
                          <Package className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
                          <p className="text-muted-foreground text-xs">{isRTL ? "لا توجد نتائج" : "No results found"}</p>
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y divide-border/20">
                          {searchResults.map((p) => (
                            <div key={p.id} className="flex items-center gap-2.5 p-2.5 hover:bg-muted/40 transition-colors">
                              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                                {p.image_url ? (
                                  <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                                ) : (
                                  <Package className="w-3.5 h-3.5 text-muted-foreground/40" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-foreground truncate">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                                <p className="text-[10px] text-muted-foreground">{p.sku}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0 gap-1 text-[10px] font-bold h-7 px-2 text-primary hover:bg-primary/10"
                                onClick={() => handleAddToQuote(p)}
                              >
                                <Plus className="w-3 h-3" />
                                {isRTL ? "تسعير" : "Quote"}
                              </Button>
                            </div>
                          ))}
                          <button
                            onClick={() => { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setShowResults(false); setSearchQuery(""); }}
                            className="w-full p-2.5 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                          >
                            {isRTL ? "عرض كل النتائج ←" : "View all results →"}
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">

        {/* ─── Quick Actions ─── */}
        <section className="grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 300, damping: 28 }}
            >
              <Link to={action.href}>
                <div className={`bg-gradient-to-br ${action.gradient} rounded-2xl p-4 md:p-5 text-white group cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5`}>
                  <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl ${action.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5 md:w-5.5 md:h-5.5 text-white" />
                  </div>
                  <p className="text-xs md:text-sm font-bold leading-snug">{action.label}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </section>

        {/* ─── Stats Row ─── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <Card className="border-border/30 rounded-xl">
                  <CardContent className="p-3.5">
                    {loading ? (
                      <Skeleton className="h-12 w-full rounded-lg" />
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-black text-foreground leading-none">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1 truncate">{stat.label}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Recent Orders ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-foreground">{isRTL ? "آخر الطلبات" : "Recent Orders"}</h2>
            <Link to="/dealer?tab=orders">
              <Button variant="ghost" size="sm" className="text-primary text-[11px] font-bold gap-0.5 h-7 px-2 rounded-lg">
                {isRTL ? "الكل" : "All"}
                <ArrowIcon className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <Card className="border-border/30 rounded-xl">
              <CardContent className="p-8 text-center">
                <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">{isRTL ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                <Link to="/dealer?tab=quotes">
                  <Button size="sm" className="gap-1.5 rounded-lg text-xs h-8">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {isRTL ? "اطلب الآن" : "Order Now"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/30 rounded-xl overflow-hidden">
              <CardContent className="p-0 divide-y divide-border/20">
                {recentOrders.map((order, i) => {
                  const st = statusMap[order.status] || statusMap.pending;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">#{order.order_number}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] font-bold border rounded-md px-1.5 py-0 ${st.color}`}>
                        {isRTL ? st.label_ar : st.label_en}
                      </Badge>
                      <span className="text-[11px] font-black text-foreground whitespace-nowrap">
                        {order.total_amount.toLocaleString()} <span className="text-muted-foreground font-normal text-[9px]">{isRTL ? "ج.م" : "EGP"}</span>
                      </span>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </section>

        {/* ─── Exclusive Offers ─── */}
        {offers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-foreground">{isRTL ? "عروض حصرية" : "Exclusive Offers"}</h2>
              <Link to="/products">
                <Button variant="ghost" size="sm" className="text-primary text-[11px] font-bold gap-0.5 h-7 px-2 rounded-lg">
                  {isRTL ? "الكل" : "All"}
                  <ArrowIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {offers.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                >
                  <Card className="border-border/30 hover:border-primary/20 transition-all duration-200 hover:shadow-md group overflow-hidden rounded-xl">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-white relative overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={isRTL ? product.name_ar : (product.name_en || product.name_ar)}
                            className="w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/30">
                            <Package className="w-6 h-6 text-muted-foreground/20" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-relaxed mb-1.5">
                          {isRTL ? product.name_ar : (product.name_en || product.name_ar)}
                        </p>
                        <p className="text-[9px] text-muted-foreground mb-2 font-mono">{product.sku}</p>
                        <Button
                          size="sm"
                          className="w-full gap-1 text-[10px] font-bold h-7 rounded-lg"
                          onClick={() => handleAddToQuote(product)}
                        >
                          <Plus className="w-3 h-3" />
                          {isRTL ? "أضف للتسعير" : "Add to Quote"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default DealerHomePage;
