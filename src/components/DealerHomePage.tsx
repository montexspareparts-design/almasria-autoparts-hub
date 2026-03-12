import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  FileText,
  TrendingUp,
  Package,
  Clock,
  Bell,
  Star,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
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
}

const statusMap: Record<string, { label_ar: string; label_en: string; color: string }> = {
  pending: { label_ar: "قيد الانتظار", label_en: "Pending", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  confirmed: { label_ar: "تمت الموافقة", label_en: "Confirmed", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  processing: { label_ar: "جاري التجهيز", label_en: "Processing", color: "bg-primary/15 text-primary border-primary/30" },
  shipped: { label_ar: "تم الشحن", label_en: "Shipped", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  delivered: { label_ar: "تم التسليم", label_en: "Delivered", color: "bg-green-500/15 text-green-600 border-green-500/30" },
  cancelled: { label_ar: "ملغى", label_en: "Cancelled", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

/* ─── Sub-components ─── */

const DealerWelcomeHeader = ({ tierLabel, isRTL }: { tierLabel: string; isRTL: boolean }) => (
  <section className="relative overflow-hidden bg-secondary/80">
    {/* Decorative elements */}
    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
    <div className="absolute top-0 end-0 w-72 h-72 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2" />
    <div className="absolute bottom-0 start-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] translate-y-1/2" />

    <div className="container mx-auto px-4 py-10 md:py-14 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-4 shadow-lg shadow-primary/10"
        >
          <Star className="w-7 h-7 text-primary" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-black tracking-wide px-4 py-1.5 rounded-full mb-4">
            {tierLabel}
          </Badge>
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-black text-secondary-foreground leading-tight">
          {isRTL ? "أهلاً بك في بوابة التجار" : "Welcome to Dealer Portal"}
        </h1>
        <p className="text-secondary-foreground/60 text-sm md:text-base mt-2 max-w-md leading-relaxed">
          {isRTL
            ? "يمكنك إدارة طلباتك ومتابعة أسعارك وطلب قطع الغيار بسهولة من هنا"
            : "Manage orders, track prices, and order parts easily from here"}
        </p>
      </motion.div>
    </div>
  </section>
);

const QuickSearchBar = ({
  searchQuery, setSearchQuery, showResults, setShowResults,
  searching, searchResults, isRTL, navigate, onAddToQuote,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showResults: boolean;
  setShowResults: (v: boolean) => void;
  searching: boolean;
  searchResults: OfferProduct[];
  isRTL: boolean;
  navigate: ReturnType<typeof useNavigate>;
  onAddToQuote: (product: OfferProduct) => void;
}) => (
  <section className="relative -mt-6 z-20 px-4">
    <div className="relative max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl scale-105" />
        <div className="relative bg-card rounded-2xl shadow-xl border border-border/60 overflow-hidden">
          <div className="relative flex items-center">
            <Search className={`absolute w-5 h-5 text-muted-foreground/60 ${isRTL ? 'right-4' : 'left-4'}`} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
              placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by part number or product name..."}
              className={`h-14 border-0 bg-transparent text-sm font-medium shadow-none focus-visible:ring-0 ${isRTL ? 'pr-12 pl-10' : 'pl-12 pr-10'}`}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setShowResults(false); }}
                className={`absolute p-1.5 rounded-full hover:bg-muted transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="absolute z-50 w-full mt-2 border-border/60 shadow-2xl overflow-hidden rounded-2xl">
              <CardContent className="p-0">
                {searching ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{isRTL ? "لا توجد نتائج" : "No results found"}</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        className="w-full flex items-center gap-3 p-3.5 hover:bg-muted/50 transition-colors text-start"
                      >
                        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
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
                          <p className="text-xs text-muted-foreground mt-0.5">{p.sku}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1 text-[10px] font-bold h-7 px-2 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => onAddToQuote(p)}
                        >
                          <Plus className="w-3 h-3" />
                          {isRTL ? "أضف للتسعير" : "Add to Quote"}
                        </Button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
                        setShowResults(false);
                        setSearchQuery("");
                      }}
                      className="w-full p-3.5 text-center text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
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
    </div>
  </section>
);

const QuickActionsGrid = ({ isRTL }: { isRTL: boolean }) => {
  const actions = [
    { icon: ShoppingCart, label: isRTL ? "اطلب قطع غيار" : "Order Parts", href: "/dealer?tab=quotes", bg: "bg-primary/10", iconColor: "text-primary" },
    { icon: LayoutDashboard, label: isRTL ? "لوحة التحكم" : "Dashboard", href: "/dealer", bg: "bg-blue-500/10", iconColor: "text-blue-600" },
    { icon: ClipboardList, label: isRTL ? "طلباتي" : "My Orders", href: "/dealer?tab=orders", bg: "bg-emerald-500/10", iconColor: "text-emerald-600" },
    { icon: FileText, label: isRTL ? "كشوفات الأسعار" : "Price Lists", href: "/dealer?tab=price_lists", bg: "bg-amber-500/10", iconColor: "text-amber-600" },
  ];

  return (
    <section>
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        {actions.map((action, i) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.07, type: "spring", stiffness: 300, damping: 25 }}
          >
            <Link to={action.href}>
              <Card className="group cursor-pointer border-border/40 hover:border-primary/25 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 rounded-2xl">
                <CardContent className="p-5 md:p-7 flex flex-col items-center text-center gap-3">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className={`w-7 h-7 md:w-8 md:h-8 ${action.iconColor}`} />
                  </div>
                  <span className="text-sm md:text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {action.label}
                  </span>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const StatsOverview = ({ stats, loading, isRTL }: { stats: { totalOrders: number; pendingOrders: number; totalSpent: number; unreadNotifs: number }; loading: boolean; isRTL: boolean }) => {
  const cards = [
    { icon: Package, label: isRTL ? "إجمالي الطلبات" : "Total Orders", value: stats.totalOrders, iconColor: "text-primary", bg: "bg-primary/10" },
    { icon: Clock, label: isRTL ? "طلبات معلقة" : "Pending", value: stats.pendingOrders, iconColor: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: TrendingUp, label: isRTL ? "المشتريات" : "Purchases", value: `${stats.totalSpent.toLocaleString()} ${isRTL ? "ج.م" : "EGP"}`, iconColor: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Bell, label: isRTL ? "إشعارات" : "Notifications", value: stats.unreadNotifs, iconColor: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  return (
    <section>
      <h2 className="text-lg md:text-xl font-black text-foreground mb-4 flex items-center gap-2">
        <span>{isRTL ? "نظرة سريعة" : "Quick Overview"}</span>
        <span className="text-lg">📊</span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className="border-border/40 rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16 rounded-lg" />
                    <Skeleton className="h-7 w-12 rounded-lg" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center`}>
                        <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                      </div>
                    </div>
                    <p className="text-xl md:text-2xl font-black text-foreground">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const RecentOrdersList = ({ orders, loading, isRTL }: { orders: OrderSummary[]; loading: boolean; isRTL: boolean }) => {
  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-black text-foreground flex items-center gap-2">
          <span>{isRTL ? "آخر الطلبات" : "Recent Orders"}</span>
          <span className="text-lg">📦</span>
        </h2>
        <Link to="/dealer?tab=orders">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1 text-xs font-bold rounded-xl">
            {isRTL ? "عرض الكل" : "View All"}
            <ArrowIcon className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-border/40 rounded-2xl">
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium mb-4">
              {isRTL ? "لا توجد طلبات بعد" : "No orders yet"}
            </p>
            <Link to="/products">
              <Button size="sm" className="gap-2 rounded-xl">
                <ShoppingCart className="w-4 h-4" />
                {isRTL ? "اطلب الآن" : "Order Now"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order, i) => {
            const st = statusMap[order.status] || statusMap.pending;
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: isRTL ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              >
                <Card className="border-border/40 hover:border-primary/20 transition-all duration-200 rounded-2xl">
                  <CardContent className="p-3.5 md:p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <ClipboardList className="w-4.5 h-4.5 text-muted-foreground/60" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">#{order.order_number}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] font-bold border rounded-lg px-2 py-0.5 ${st.color}`}>
                        {isRTL ? st.label_ar : st.label_en}
                      </Badge>
                      <span className="text-xs font-black text-foreground whitespace-nowrap">
                        {order.total_amount.toLocaleString()} <span className="text-muted-foreground font-medium">{isRTL ? "ج.م" : "EGP"}</span>
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
  );
};

const ExclusiveOffers = ({ offers, isRTL, onAddToQuote }: { offers: OfferProduct[]; isRTL: boolean; onAddToQuote: (p: OfferProduct) => void }) => {
  if (offers.length === 0) return null;
  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-black text-foreground flex items-center gap-2">
          <span>{isRTL ? "عروض حصرية" : "Exclusive Offers"}</span>
          <span className="text-lg">🏷️</span>
        </h2>
        <Link to="/products">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1 text-xs font-bold rounded-xl">
            {isRTL ? "عرض الكل" : "View All"}
            <ArrowIcon className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {offers.map((product, i) => {
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            >
              <Card className="border-border/40 hover:border-primary/20 transition-all duration-200 hover:shadow-lg group overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted/50 relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={isRTL ? product.name_ar : (product.name_en || product.name_ar)}
                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground/20" />
                      </div>
                    )}
                    <Badge className="absolute top-2 start-2 bg-primary/90 text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-lg">
                      {isRTL ? "عرض خاص" : "Sale"}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-foreground line-clamp-2 leading-relaxed mb-2">
                      {isRTL ? product.name_ar : (product.name_en || product.name_ar)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-2">{product.sku}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1 text-[10px] font-bold h-7 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => onAddToQuote(product)}
                    >
                      <Plus className="w-3 h-3" />
                      {isRTL ? "أضف للتسعير" : "Add to Quote"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
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
    // Store product in sessionStorage for the quote builder to pick up
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

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <DealerWelcomeHeader tierLabel={tierLabel} isRTL={isRTL} />

      <QuickSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showResults={showResults}
        setShowResults={setShowResults}
        searching={searching}
        searchResults={searchResults}
        isRTL={isRTL}
        navigate={navigate}
        onAddToQuote={handleAddToQuote}
      />

      <div className="container mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-12">
        <QuickActionsGrid isRTL={isRTL} />
        <StatsOverview stats={stats} loading={loading} isRTL={isRTL} />
        <RecentOrdersList orders={recentOrders} loading={loading} isRTL={isRTL} />
        <ExclusiveOffers offers={offers} isRTL={isRTL} onAddToQuote={handleAddToQuote} />
      </div>
    </div>
  );
};

export default DealerHomePage;
