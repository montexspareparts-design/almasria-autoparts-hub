import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ClipboardList, FileText, TrendingUp, Package, Clock,
  Bell, Search, X, ChevronLeft, ChevronRight, Plus, ArrowRight,
  CreditCard, Zap, BarChart3, Eye, Home, Tag, User, Send,
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

/* ─── Types ─── */
interface OrderSummary { id: string; order_number: string; status: string; total_amount: number; created_at: string; }
interface ProductItem { id: string; name_ar: string; name_en: string | null; sku: string; base_price: number; sale_price: number | null; image_url: string | null; brand?: string; }

const statusConfig: Record<string, { ar: string; en: string; bg: string; text: string }> = {
  pending:    { ar: "قيد الانتظار", en: "Pending",    bg: "bg-amber-50",   text: "text-amber-700" },
  confirmed:  { ar: "مؤكد",        en: "Confirmed",  bg: "bg-blue-50",    text: "text-blue-700" },
  processing: { ar: "جاري التجهيز", en: "Processing", bg: "bg-primary/10", text: "text-primary" },
  shipped:    { ar: "تم الشحن",    en: "Shipped",    bg: "bg-violet-50",  text: "text-violet-700" },
  delivered:  { ar: "تم التسليم",  en: "Delivered",  bg: "bg-emerald-50", text: "text-emerald-700" },
  cancelled:  { ar: "ملغى",        en: "Cancelled",  bg: "bg-red-50",     text: "text-red-600" },
};

const brandLabels: Record<string, string> = {
  toyota_genuine: "Toyota", toyota_oils: "Toyota Oil", mtx_aftermarket: "MTX", denso: "DENSO", aisin: "AISIN",
};

/* ─── Bottom Nav for Home ─── */
const DealerHomeBottomNav = ({ isRTL }: { isRTL: boolean }) => {
  const navigate = useNavigate();
  const tabs = [
    { id: "home", label: isRTL ? "الرئيسية" : "Home", icon: Home, href: "/" },
    { id: "products", label: isRTL ? "المنتجات" : "Products", icon: Package, href: "/products" },
    { id: "orders", label: isRTL ? "طلباتي" : "Orders", icon: ClipboardList, href: "/dealer?tab=orders" },
    { id: "offers", label: isRTL ? "العروض" : "Offers", icon: Tag, href: "/dealer?tab=offers" },
    { id: "account", label: isRTL ? "حسابي" : "Account", icon: User, href: "/dealer" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/98 backdrop-blur-xl border-t border-border/50 lg:hidden shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-[60px] px-1 max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.href)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[56px] ${
              tab.id === "home" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="w-[20px] h-[20px]" strokeWidth={tab.id === "home" ? 2.5 : 1.8} />
            <span className={`text-[10px] leading-tight ${tab.id === "home" ? "font-bold" : "font-medium"}`}>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

/* ─── Component ─── */
const DealerHomePage = () => {
  const { user, dealerAccount } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isRTL = lang === "ar";

  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, totalSpent: 0, unreadNotifs: 0 });
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [offers, setOffers] = useState<ProductItem[]>([]);
  const [popularProducts, setPopularProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  /* Quick Order State */
  const [quickSku, setQuickSku] = useState("");
  const [quickQty, setQuickQty] = useState("1");

  /* Search */
  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    setSearching(true); setShowResults(true);
    const { data } = await supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url")
      .eq("is_active", true).or(`name_ar.ilike.%${q.trim()}%,name_en.ilike.%${q.trim()}%,sku.ilike.%${q.trim()}%`).limit(8);
    setSearchResults((data as ProductItem[]) || []); setSearching(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => handleSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery, handleSearch]);

  /* Data */
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [ordersRes, notifsRes, offersRes, popularRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, status, total_amount, created_at").eq("user_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url").eq("is_active", true).eq("is_on_sale", true).limit(6),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url, brand, stock_quantity").eq("is_active", true).gt("stock_quantity", 20).order("stock_quantity", { ascending: false }).limit(8),
      ]);
      const orders = ordersRes.data || [];
      setRecentOrders(orders.slice(0, 4));
      const { count: totalCount } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "cancelled");
      const { data: allOrders } = await supabase.from("orders").select("total_amount, status").eq("user_id", user.id).neq("status", "cancelled");
      setStats({
        totalOrders: totalCount || 0,
        pendingOrders: (allOrders || []).filter(o => ["pending", "confirmed"].includes(o.status)).length,
        totalSpent: (allOrders || []).reduce((s, o) => s + (o.total_amount || 0), 0),
        unreadNotifs: notifsRes.count || 0,
      });
      setOffers((offersRes.data as ProductItem[]) || []);
      setPopularProducts(((popularRes.data as any[]) || []).sort(() => Math.random() - 0.5).map(p => ({ id: p.id, name_ar: p.name_ar, name_en: p.name_en, sku: p.sku, base_price: p.base_price, sale_price: p.sale_price, image_url: p.image_url, brand: p.brand })));
      setLoading(false);
    })();
  }, [user]);

  const tierLabel = dealerAccount?.tier === "wholesale_tier1" ? (isRTL ? "جملة - الدرجة الأولى" : "Wholesale T1")
    : dealerAccount?.tier === "wholesale_tier2" ? (isRTL ? "جملة - الدرجة الثانية" : "Wholesale T2")
    : dealerAccount?.tier === "corporate" ? (isRTL ? "شركات" : "Corporate") : (isRTL ? "تجزئة" : "Retail");

  const handleAddToQuote = useCallback((product: ProductItem) => {
    const existing = JSON.parse(sessionStorage.getItem("quote_pending_items") || "[]");
    if (!existing.find((p: any) => p.id === product.id)) {
      existing.push({ id: product.id, sku: product.sku, name_ar: product.name_ar, name_en: product.name_en });
      sessionStorage.setItem("quote_pending_items", JSON.stringify(existing));
    }
    toast({ title: "✅ " + (isRTL ? "تمت الإضافة" : "Added"), description: product.name_ar });
  }, [isRTL, toast]);

  const handleQuickOrder = useCallback(async () => {
    if (!quickSku.trim()) return;
    const { data } = await supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url")
      .eq("is_active", true).ilike("sku", `%${quickSku.trim()}%`).limit(1);
    if (data && data.length > 0) {
      const product = data[0] as ProductItem;
      const qty = parseInt(quickQty) || 1;
      const existing = JSON.parse(sessionStorage.getItem("quote_pending_items") || "[]");
      const existingIdx = existing.findIndex((p: any) => p.id === product.id);
      if (existingIdx >= 0) {
        existing[existingIdx].qty = (existing[existingIdx].qty || 1) + qty;
      } else {
        existing.push({ id: product.id, sku: product.sku, name_ar: product.name_ar, name_en: product.name_en, qty });
      }
      sessionStorage.setItem("quote_pending_items", JSON.stringify(existing));
      toast({ title: "✅ " + (isRTL ? "تمت الإضافة للتسعير" : "Added to quote"), description: `${product.name_ar} × ${qty}` });
      setQuickSku(""); setQuickQty("1");
    } else {
      toast({ title: isRTL ? "⚠️ غير موجود" : "⚠️ Not found", description: isRTL ? "رقم القطعة غير موجود" : "Part number not found", variant: "destructive" });
    }
  }, [quickSku, quickQty, isRTL, toast]);

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  /* ─── Render ─── */
  return (
    <div className="pt-14 md:pt-16 pb-20 lg:pb-6 min-h-screen bg-muted/30" dir={isRTL ? "rtl" : "ltr"}>

      {/* ━━━ SEARCH HERO — Primary Element ━━━ */}
      <div className="bg-card border-b border-border/30">
        <div className="container mx-auto px-4 pt-5 pb-4 md:pt-6 md:pb-5">
          {/* Welcome - compact */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">{isRTL ? "بوابة التجار" : "Dealer Portal"}</p>
              <h1 className="text-lg md:text-xl font-black text-foreground">{isRTL ? "مرحباً بك" : "Welcome"} 👋</h1>
            </div>
            <Badge className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20 px-2 py-0.5 shrink-0">{tierLabel}</Badge>
          </motion.div>

          {/* ━━━ LARGE SEARCH BAR — Primary Element ━━━ */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative">
            <div className={`relative flex items-center rounded-xl border-2 transition-all duration-200 ${
              searchFocused ? "border-primary bg-background shadow-lg shadow-primary/5" : "border-border bg-background hover:border-primary/30"
            }`}>
              <Search className={`absolute w-5 h-5 text-muted-foreground/40 ${isRTL ? 'right-4' : 'left-4'}`} />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { setSearchFocused(true); searchQuery.trim().length >= 2 && setShowResults(true); }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by part number or name..."}
                className={`h-12 md:h-14 border-0 bg-transparent text-sm md:text-base shadow-none focus-visible:ring-0 font-medium ${isRTL ? 'pr-11 pl-9' : 'pl-11 pr-9'}`}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className={`absolute p-1.5 rounded-full hover:bg-muted ${isRTL ? 'left-3' : 'right-3'}`}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showResults && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute z-50 w-full mt-1.5">
                  <Card className="shadow-2xl border-border/50 rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      {searching ? (
                        <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-6 text-center">
                          <Package className="w-6 h-6 text-muted-foreground/15 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">{isRTL ? "لا توجد نتائج" : "No results"}</p>
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y divide-border/10">
                          {searchResults.map(p => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                              <div className="w-9 h-9 rounded-lg bg-muted/60 shrink-0 overflow-hidden flex items-center justify-center">
                                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-0.5" /> : <Package className="w-3.5 h-3.5 text-muted-foreground/30" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                              </div>
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-[10px] font-bold text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground" onClick={() => handleAddToQuote(p)}>
                                <Plus className="w-3 h-3 mr-0.5" />{isRTL ? "تسعير" : "Quote"}
                              </Button>
                            </div>
                          ))}
                          <button
                            onClick={() => { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setShowResults(false); setSearchQuery(""); }}
                            className="w-full py-2.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                          >
                            {isRTL ? "عرض كل النتائج ←" : "View all →"}
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
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">

        {/* ━━━ QUICK ORDER — Inline Form ━━━ */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/40 rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border/30">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-xs font-bold text-foreground">{isRTL ? "طلب سريع" : "Quick Order"}</h2>
              </div>
              <div className="p-3 flex items-center gap-2">
                <Input
                  value={quickSku}
                  onChange={e => setQuickSku(e.target.value)}
                  placeholder={isRTL ? "رقم القطعة" : "Part Number"}
                  className="flex-1 h-10 text-sm font-mono bg-muted/30 border-border/50"
                  onKeyDown={e => e.key === "Enter" && handleQuickOrder()}
                />
                <Input
                  type="number"
                  value={quickQty}
                  onChange={e => setQuickQty(e.target.value)}
                  placeholder={isRTL ? "الكمية" : "Qty"}
                  className="w-16 h-10 text-sm text-center bg-muted/30 border-border/50"
                  min="1"
                />
                <Button onClick={handleQuickOrder} size="sm" className="h-10 px-4 gap-1.5 font-bold text-xs shrink-0">
                  <Send className="w-3.5 h-3.5" />
                  {isRTL ? "أضف" : "Add"}
                </Button>
              </div>
              <div className="px-4 pb-2.5">
                <button onClick={() => navigate("/dealer?tab=quotes")} className="text-[10px] text-primary font-semibold hover:underline">
                  {isRTL ? "فتح منشئ عروض الأسعار الكامل ←" : "Open full quote builder →"}
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* ━━━ QUICK ACTIONS — 4 Cards ━━━ */}
        <section>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: ShoppingCart, label: isRTL ? "اطلب" : "Order", href: "/dealer?tab=quotes", primary: true },
              { icon: ClipboardList, label: isRTL ? "طلباتي" : "Orders", href: "/dealer?tab=orders" },
              { icon: FileText, label: isRTL ? "الأسعار" : "Prices", href: "/dealer?tab=price_lists" },
              { icon: CreditCard, label: isRTL ? "الدفع" : "Pay", href: "/dealer?tab=payment" },
            ].map((a, i) => (
              <motion.div key={a.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.04 }}>
                <Link to={a.href} className="block">
                  <div className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all group hover:shadow-md hover:-translate-y-0.5 ${
                    a.primary ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border/40 hover:border-primary/30'
                  }`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.primary ? 'bg-white/15' : 'bg-primary/8'}`}>
                      <a.icon className={`w-4.5 h-4.5 ${a.primary ? 'text-white' : 'text-primary'}`} />
                    </div>
                    <p className={`text-[11px] font-bold ${a.primary ? '' : 'text-foreground'}`}>{a.label}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ━━━ STATS — Compact Row ━━━ */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: isRTL ? "الطلبات" : "Orders", value: stats.totalOrders, icon: BarChart3, color: "text-primary" },
              { label: isRTL ? "معلّقة" : "Pending", value: stats.pendingOrders, icon: Clock, color: "text-amber-600" },
              { label: isRTL ? "المشتريات" : "Spent", value: `${(stats.totalSpent / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-emerald-600" },
              { label: isRTL ? "إشعارات" : "Alerts", value: stats.unreadNotifs, icon: Bell, color: "text-blue-600" },
            ].map((s, i) => (
              <div key={i} className="bg-card rounded-xl border border-border/30 p-2.5 text-center">
                {loading ? <Skeleton className="h-10 rounded" /> : (
                  <>
                    <s.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${s.color}`} />
                    <p className="text-sm font-black text-foreground leading-none">{s.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* ━━━ RECENT ORDERS ━━━ */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold text-foreground">{isRTL ? "آخر الطلبات" : "Recent Orders"}</h2>
            <Link to="/dealer?tab=orders">
              <Button variant="ghost" size="sm" className="text-primary text-[10px] font-semibold h-6 px-2 gap-0.5 hover:bg-primary/5">
                {isRTL ? "الكل" : "All"}<ArrowIcon className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : recentOrders.length === 0 ? (
            <Card className="border-border/30 rounded-xl">
              <CardContent className="p-6 text-center">
                <Package className="w-8 h-8 text-muted-foreground/15 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">{isRTL ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                <Link to="/dealer?tab=quotes"><Button size="sm" className="gap-1.5 text-[11px] h-8 rounded-lg"><ShoppingCart className="w-3.5 h-3.5" />{isRTL ? "اطلب الآن" : "Order Now"}</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {recentOrders.map((order, i) => {
                const st = statusConfig[order.status] || statusConfig.pending;
                return (
                  <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.04 }}>
                    <Card className="border-border/20 rounded-lg overflow-hidden hover:border-primary/15 transition-colors">
                      <CardContent className="px-3 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[11px] font-bold text-foreground">#{order.order_number}</p>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>{isRTL ? st.ar : st.en}</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { day: "numeric", month: "short" })}</p>
                        </div>
                        <p className="text-xs font-black text-foreground whitespace-nowrap">
                          {order.total_amount.toLocaleString()} <span className="text-[8px] text-muted-foreground font-normal">{isRTL ? "ج.م" : "EGP"}</span>
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ━━━ POPULAR PRODUCTS ━━━ */}
        {popularProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-primary" />
                {isRTL ? "الأكثر طلباً" : "Most Popular"}
              </h2>
              <Badge variant="outline" className="text-[8px] font-medium border-border/40 text-muted-foreground px-1.5 py-0">{isRTL ? "متوفر" : "In stock"}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {popularProducts.slice(0, 4).map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }}>
                  <Card className="border-border/20 rounded-xl overflow-hidden group hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <CardContent className="p-0">
                      <div className="aspect-[4/3] bg-white relative overflow-hidden flex items-center justify-center">
                        {p.image_url ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        : <Package className="w-8 h-8 text-muted-foreground/10" />}
                        {p.brand && <span className="absolute top-1 left-1 text-[7px] font-bold bg-foreground/80 text-background px-1.5 py-0.5 rounded-sm">{brandLabels[p.brand] || p.brand}</span>}
                      </div>
                      <div className="p-2 border-t border-border/15">
                        <p className="text-[10px] font-semibold text-foreground line-clamp-1 mb-0.5">{p.name_ar}</p>
                        <p className="text-[8px] text-muted-foreground font-mono mb-1.5">{p.sku}</p>
                        <Button size="sm" variant="outline" className="w-full h-7 text-[9px] font-bold gap-1 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground rounded-md" onClick={() => handleAddToQuote(p)}>
                          <Plus className="w-2.5 h-2.5" />{isRTL ? "طلب تسعير" : "Quote"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ━━━ OFFERS ━━━ */}
        {offers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-primary" />
                {isRTL ? "عروض حصرية" : "Exclusive Offers"}
              </h2>
              <Link to="/products">
                <Button variant="ghost" size="sm" className="text-primary text-[10px] font-semibold h-6 px-2 gap-0.5 hover:bg-primary/5">
                  {isRTL ? "الكل" : "All"}<ArrowIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {offers.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.03 }}>
                  <Card className="border-border/20 rounded-xl overflow-hidden group hover:border-primary/20 hover:shadow-md transition-all">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-white relative overflow-hidden flex items-center justify-center">
                        {p.image_url ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        : <Package className="w-5 h-5 text-muted-foreground/10" />}
                      </div>
                      <div className="p-1.5 border-t border-border/15">
                        <p className="text-[8px] font-semibold text-foreground line-clamp-2 leading-relaxed mb-1">{p.name_ar}</p>
                        <p className="text-[7px] text-muted-foreground font-mono mb-1">{p.sku}</p>
                        <Button size="sm" className="w-full h-5 text-[7px] font-bold gap-0.5 rounded" onClick={() => handleAddToQuote(p)}>
                          <Plus className="w-2 h-2" />{isRTL ? "تسعير" : "Quote"}
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

      {/* ━━━ BOTTOM NAVIGATION ━━━ */}
      <DealerHomeBottomNav isRTL={isRTL} />
    </div>
  );
};

export default DealerHomePage;
