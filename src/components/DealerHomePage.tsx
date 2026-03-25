import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, FileText, Package,
  Search, X, ChevronLeft, ChevronRight, Plus, ArrowRight,
  CreditCard, Home, Tag, User, Receipt,
  Sparkles, CheckCircle2, XCircle, Truck, Zap,
  BarChart3, TrendingUp, Clock, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import dealerQuotesIcon from "@/assets/dealer-quotes-icon.png";
import dealerOrdersIcon from "@/assets/dealer-orders-icon.png";
import dealerLogo from "@/assets/logo.webp";

/* ─── Types ─── */
interface OrderSummary { id: string; order_number: string; status: string; total_amount: number; created_at: string; }
interface ProductItem { id: string; name_ar: string; name_en: string | null; sku: string; base_price: number; sale_price: number | null; image_url: string | null; stock_quantity?: number; brand?: string; }

/* ─── Easing ─── */
const spring = { type: "spring", stiffness: 300, damping: 30 } as const;
const ease = [0.22, 1, 0.36, 1] as const;

/* ─── Stock Badge ─── */
const StockBadge = ({ qty, isRTL }: { qty: number; isRTL: boolean }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
    qty > 0
      ? "text-emerald-700 bg-emerald-500/10"
      : "text-destructive bg-destructive/10"
  }`}>
    {qty > 0 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {qty > 0 ? (isRTL ? "متوفر" : "In Stock") : (isRTL ? "غير متوفر" : "Out of Stock")}
  </span>
);

/* ─── Bottom Nav ─── */
const DealerHomeBottomNav = ({ isRTL }: { isRTL: boolean }) => {
  const navigate = useNavigate();
  const tabs = [
    { id: "home", label: isRTL ? "الرئيسية" : "Home", icon: Home, href: "/", active: true },
    { id: "products", label: isRTL ? "المنتجات" : "Products", icon: Package, href: "/products" },
    { id: "orders", label: isRTL ? "طلباتي" : "Orders", icon: ClipboardList, href: "/dealer?tab=orders" },
    { id: "quick_order", label: isRTL ? "طلب سريع" : "Quick Order", icon: Zap, href: "/dealer?tab=quick_order" },
    { id: "account", label: isRTL ? "حسابي" : "Account", icon: User, href: "/dealer?tab=settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="mx-2 mb-2 rounded-[18px] bg-card/90 backdrop-blur-2xl border border-border/30 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-[62px] px-1 max-w-lg mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.href)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-300 min-w-[50px] ${
                tab.active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative ${tab.active ? "" : ""}`}>
                <tab.icon className="w-[22px] h-[22px]" strokeWidth={tab.active ? 2.5 : 1.8} />
                {tab.active && (
                  <motion.div layoutId="bottomNavDot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[9px] leading-tight mt-0.5 ${tab.active ? "font-bold" : "font-medium"}`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

/* ─── Main Component ─── */
const DealerHomePage = () => {
  const { user, dealerAccount } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isRTL = lang === "ar";

  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [offers, setOffers] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyViewCount, setDailyViewCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const DAILY_PRICE_LIMIT = 20;

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    setSearching(true); setShowResults(true);
    const { data } = await supabase
      .from("products")
      .select("id, name_ar, name_en, sku, base_price, sale_price, image_url, stock_quantity")
      .eq("is_active", true)
      .or(`name_ar.ilike.%${q.trim()}%,name_en.ilike.%${q.trim()}%,sku.ilike.%${q.trim()}%`)
      .limit(8);
    setSearchResults((data as ProductItem[]) || []);
    setSearching(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => handleSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery, handleSearch]);

  const refreshDailyCount = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_daily_view_count", { _user_id: user.id });
    setDailyViewCount(typeof data === "number" ? data : 0);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [ordersRes, offersRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, status, total_amount, created_at")
          .eq("user_id", user.id).neq("status", "cancelled")
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url, stock_quantity")
          .eq("is_active", true).eq("is_on_sale", true).limit(6),
      ]);
      setRecentOrders(ordersRes.data || []);
      setOffers((offersRes.data as ProductItem[]) || []);
      setLoading(false);
      refreshDailyCount();
    })();
  }, [user, refreshDailyCount]);

  const tierLabel = dealerAccount?.tier === "wholesale_tier1" ? (isRTL ? "جملة T1" : "Wholesale T1")
    : dealerAccount?.tier === "wholesale_tier2" ? (isRTL ? "جملة T2" : "Wholesale T2")
    : dealerAccount?.tier === "corporate" ? (isRTL ? "شركات" : "Corporate") : (isRTL ? "تجزئة" : "Retail");

  const handlePriceItem = useCallback(async (product: ProductItem) => {
    if (!user) return;
    if (dailyViewCount >= DAILY_PRICE_LIMIT) {
      toast({ title: isRTL ? "⚠️ تم الوصول للحد اليومي" : "⚠️ Daily limit reached", description: isRTL ? `الحد الأقصى ${DAILY_PRICE_LIMIT} صنف يومياً` : `Maximum ${DAILY_PRICE_LIMIT} items per day`, variant: "destructive" });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("dealer_price_views").upsert({ user_id: user.id, product_id: product.id, view_date: today }, { onConflict: "user_id,product_id,view_date" });
    if (!error) { await refreshDailyCount(); toast({ title: "✅", description: isRTL ? `تم تسعير ${product.name_ar}` : `Priced ${product.name_ar}` }); }
  }, [isRTL, toast, user, dailyViewCount, refreshDailyCount]);

  const handleAddToOrder = useCallback((product: ProductItem) => {
    const existing = JSON.parse(sessionStorage.getItem("quote_pending_items") || "[]");
    if (!existing.find((p: any) => p.id === product.id)) {
      existing.push({ id: product.id, sku: product.sku, name_ar: product.name_ar, name_en: product.name_en });
      sessionStorage.setItem("quote_pending_items", JSON.stringify(existing));
    }
    toast({ title: "✅", description: isRTL ? `تم إضافة ${product.name_ar} للطلب` : `Added ${product.name_ar} to order` });
  }, [isRTL, toast]);

  const getDiscount = (p: ProductItem) => {
    if (!p.sale_price || p.sale_price >= p.base_price) return null;
    return Math.round(((p.base_price - p.sale_price) / p.base_price) * 100);
  };

  const activeOrders = recentOrders.filter(o => !["delivered","cancelled"].includes(o.status)).length;

  /* ─── Quick Action Items ─── */
  const quickActions = [
    { label: isRTL ? "عروض الأسعار" : "Quotes", icon: Tag, href: "/dealer?tab=quotes", isImage: false, badge: dailyViewCount > 0 ? `${dailyViewCount} ${isRTL ? "تسعير" : "priced"}` : null, badgeColor: "bg-primary/8 text-primary", iconColor: "text-primary", iconBg: "bg-primary/8" },
    { label: isRTL ? "كشوفات المصرية" : "Price Lists", icon: FileText, href: "/dealer?tab=price_lists", isImage: false, sub: isRTL ? "الأسعار المحدثة" : "Updated prices", iconColor: "text-amber-600", iconBg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: isRTL ? "طلباتي" : "Orders", icon: ClipboardList, href: "/dealer?tab=orders", isImage: false, badge: activeOrders > 0 ? `${activeOrders} ${isRTL ? "جارية" : "active"}` : null, badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10", iconColor: "text-blue-600", iconBg: "bg-blue-50 dark:bg-blue-500/10" },
  ];

  const accountLinks = [
    { icon: CreditCard, label: isRTL ? "الدفع الإلكتروني" : "Make Payment", desc: isRTL ? "سدد مستحقاتك أونلاين" : "Pay invoices online", href: "/dealer?tab=payment", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { icon: FileText, label: isRTL ? "الفواتير" : "Invoices", desc: isRTL ? "عرض وتحميل الفواتير" : "View & download invoices", href: "/dealer?tab=invoices", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { icon: Truck, label: isRTL ? "تتبع الشحنات" : "Track Shipments", desc: isRTL ? "تتبع حالة شحناتك" : "Track your shipments", href: "/dealer?tab=orders", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-500/10" },
    { icon: Receipt, label: isRTL ? "كشف الحساب" : "Account Statement", desc: isRTL ? "رصيدك وحركات الحساب" : "Balance & transactions", href: "/dealer?tab=statement", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-500/10" },
  ];

  return (
    <div className="pt-14 md:pt-16 pb-24 lg:pb-6 min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — Dark premium header
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-visible bg-secondary">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        {/* Red glow accent */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-primary/8 blur-[80px]" />

        <div className="relative container mx-auto px-4 pt-8 pb-12 md:pt-12 md:pb-16 max-w-3xl">
          {/* Top row */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="flex items-start justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden">
                <img src={dealerLogo} alt="" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <p className="text-secondary-foreground/40 text-[10px] font-semibold tracking-[0.25em] uppercase">
                  {isRTL ? "بوابة التجار" : "Dealer Portal"}
                </p>
                <h1 className="text-xl md:text-2xl font-black text-secondary-foreground leading-tight mt-0.5">
                  {isRTL ? "ابحث واطلب بسرعة" : "Search & Order Fast"}
                </h1>
              </div>
            </div>
            <Badge className="text-[10px] font-bold bg-primary text-primary-foreground border-0 px-3 py-1.5 rounded-lg shadow-lg shadow-primary/30 shrink-0 mt-1">
              {tierLabel}
            </Badge>
          </motion.div>

          {/* ─── SEARCH BAR ─── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="relative"
          >
            <div className={`relative flex items-center rounded-2xl transition-all duration-300 bg-white dark:bg-white/10 ${
              searchFocused
                ? "shadow-[0_0_0_3px_hsl(var(--primary)/0.15),0_20px_40px_rgba(0,0,0,0.12)] ring-1 ring-primary/20"
                : "shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
            }`}>
              <Search className={`absolute w-5 h-5 transition-colors ${searchFocused ? "text-primary" : "text-muted-foreground/30"} ${isRTL ? 'right-5' : 'left-5'}`} />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { setSearchFocused(true); searchQuery.trim().length >= 2 && setShowResults(true); }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by Part Number or Product Name..."}
                className={`h-14 md:h-[60px] border-0 bg-transparent text-base md:text-lg shadow-none focus-visible:ring-0 font-medium placeholder:text-muted-foreground/30 ${isRTL ? 'pr-14 pl-12' : 'pl-14 pr-12'}`}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className={`absolute p-2 rounded-xl hover:bg-muted/50 transition-colors ${isRTL ? 'left-3' : 'right-3'}`}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Hint chips */}
            <div className="flex items-center justify-between mt-3.5 px-1">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {[
                  isRTL ? "قطع المحرك" : "Engine Parts",
                  isRTL ? "الفلاتر" : "Filters",
                  isRTL ? "العفشة" : "Suspension",
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setSearchQuery(hint)}
                    className="text-[10px] text-secondary-foreground/40 bg-white/[0.07] hover:bg-white/[0.12] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-semibold border border-white/[0.06]"
                  >
                    {hint}
                  </button>
                ))}
              </div>
              <span className={`text-[10px] font-bold shrink-0 px-2.5 py-1 rounded-full ${
                dailyViewCount >= DAILY_PRICE_LIMIT
                  ? "text-destructive bg-destructive/15"
                  : "text-secondary-foreground/40 bg-white/[0.07]"
              }`}>
                {dailyViewCount}/{DAILY_PRICE_LIMIT} {isRTL ? "تسعير" : "priced"}
              </span>
            </div>

            {/* ─── Search Dropdown ─── */}
            <AnimatePresence>
              {showResults && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="absolute z-50 w-full mt-2">
                  <div className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
                    {searching ? (
                      <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-12 text-center">
                        <Search className="w-8 h-8 text-muted-foreground/10 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">{isRTL ? "لا توجد نتائج" : "No results found"}</p>
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
                        {searchResults.map((p) => {
                          const stock = p.stock_quantity ?? 0;
                          return (
                            <div key={p.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer">
                              <div className="w-12 h-12 rounded-xl bg-muted/30 shrink-0 overflow-hidden flex items-center justify-center">
                                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-1" /> : <Package className="w-5 h-5 text-muted-foreground/20" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</p>
                                <div className="mt-1.5"><StockBadge qty={stock} isRTL={isRTL} /></div>
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0 mt-1">
                                <Button size="sm" variant="outline" className="h-8 px-2.5 text-[11px] font-bold gap-1 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => handlePriceItem(p)}>
                                  <Tag className="w-3 h-3" />{isRTL ? "تسعير" : "Price"}
                                </Button>
                                <Button size="sm" className="h-8 px-2.5 text-[11px] font-bold gap-1 rounded-lg" onClick={() => handleAddToOrder(p)} disabled={stock === 0}>
                                  <Plus className="w-3 h-3" />{isRTL ? "أضف" : "Add"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        <button onClick={() => { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setShowResults(false); setSearchQuery(""); }} className="w-full py-3.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5">
                          {isRTL ? "عرض كل النتائج" : "View all results"}
                          <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ━━━ CONTENT ━━━ */}
      <div className="container mx-auto px-4 max-w-3xl">

        {/* ─── Quick Actions — Premium Bento Grid ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease }}
          className="grid grid-cols-3 gap-4 pt-8"
        >
          {quickActions.map((item, i) => (
            <Link key={item.href} to={item.href} className="block group">
              <motion.div
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.96 }}
                transition={spring}
                className="relative bg-card rounded-[20px] border border-border/40 p-5 md:p-6 flex flex-col items-center text-center gap-3 h-full overflow-hidden
                  shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                  hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)]
                  hover:border-primary/20
                  transition-all duration-500"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className={`relative w-16 h-16 rounded-[18px] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg ${item.iconBg}`}>
                  <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                </div>

                <div className="relative">
                  <p className="text-sm font-extrabold text-foreground leading-tight tracking-tight">{item.label}</p>
                  {item.badge && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold ${item.badgeColor} px-2.5 py-1 rounded-full`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                      {item.badge}
                    </motion.span>
                  )}
                  {item.sub && <p className="text-[11px] text-muted-foreground mt-1 font-medium">{item.sub}</p>}
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* ─── Offers Section ─── */}
        {loading ? (
          <div className="mt-8">
            <Skeleton className="h-5 w-32 mb-4 rounded" />
            <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
          </div>
        ) : offers.length > 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5, ease }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                {isRTL ? "العروض المتاحة" : "Available Offers"}
              </h2>
              <Link to="/dealer?tab=offers">
                <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold h-8 px-3 gap-1 hover:bg-primary/5 rounded-xl">
                  {isRTL ? "عرض الكل" : "View All"}{isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {offers.slice(0, 6).map((p, i) => {
                const discount = getDiscount(p);
                const stock = p.stock_quantity ?? 0;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 + i * 0.05, duration: 0.4, ease }}
                  >
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={spring}
                      className="bg-card border border-border/40 rounded-2xl overflow-hidden group
                        shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                        hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.1)]
                        hover:border-primary/15
                        transition-all duration-500"
                    >
                      <div className="aspect-square bg-gradient-to-br from-muted/10 to-muted/30 relative overflow-hidden flex items-center justify-center">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
                          : <Package className="w-10 h-10 text-muted-foreground/10" />}
                        {discount && (
                          <span className="absolute top-2.5 left-2.5 text-[10px] font-black bg-primary text-primary-foreground px-2.5 py-1 rounded-lg shadow-md shadow-primary/20">
                            -{discount}%
                          </span>
                        )}
                        <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ring-[2.5px] ring-card ${stock > 0 ? "bg-emerald-500 shadow-sm shadow-emerald-500/40" : "bg-muted-foreground/25"}`} />
                      </div>
                      <div className="p-3.5 border-t border-border/20">
                        <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mb-3">{p.sku}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 h-9 text-[11px] font-bold gap-1 rounded-xl border-border/50 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300" onClick={() => handlePriceItem(p)}>
                            <Tag className="w-3.5 h-3.5" />{isRTL ? "تسعير" : "Price"}
                          </Button>
                          <Button size="sm" className="flex-1 h-9 text-[11px] font-bold gap-1 rounded-xl shadow-sm shadow-primary/15" onClick={() => handleAddToOrder(p)} disabled={stock === 0}>
                            <Plus className="w-3.5 h-3.5" />{isRTL ? "أضف" : "Add"}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        ) : null}

        {/* ─── Account & Payments — Premium Section ─── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease }}
          className="mt-10 mb-6"
        >
          <h2 className="text-base font-bold text-foreground mb-5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            {isRTL ? "الحساب والمدفوعات" : "Account & Payments"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accountLinks.map((item, i) => (
              <Link key={item.href + item.label} to={item.href}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.06, ease }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative bg-card rounded-[18px] border border-border/40 p-5 flex items-center gap-4 overflow-hidden
                    shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                    hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.1)]
                    hover:border-primary/15
                    transition-all duration-500 group cursor-pointer"
                >
                  {/* Decorative corner accent */}
                  <div className={`absolute -top-8 -right-8 w-20 h-20 rounded-full ${item.bg} opacity-40 blur-xl group-hover:opacity-60 transition-opacity duration-500`} />

                  <div className={`relative w-12 h-12 rounded-[14px] ${item.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <item.icon className={`w-[22px] h-[22px] ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <p className="text-[14px] font-bold text-foreground">{item.label}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">{item.desc}</p>
                  </div>
                  <div className="relative shrink-0">
                    {isRTL
                      ? <ChevronLeft className="w-5 h-5 text-muted-foreground/15 group-hover:text-primary group-hover:-translate-x-1.5 transition-all duration-300" />
                      : <ChevronRight className="w-5 h-5 text-muted-foreground/15 group-hover:text-primary group-hover:translate-x-1.5 transition-all duration-300" />
                    }
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ─── Trust strip ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-8 py-8 mb-2"
        >
          {[
            { icon: ShieldCheck, text: isRTL ? "قطع أصلية ١٠٠٪" : "100% Genuine" },
            { icon: Truck, text: isRTL ? "شحن سريع" : "Fast Shipping" },
            { icon: Clock, text: isRTL ? "دعم ٢٤/٧" : "24/7 Support" },
          ].map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.08 }}
              className="flex items-center gap-2 text-muted-foreground/40"
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold tracking-wide">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <DealerHomeBottomNav isRTL={isRTL} />
    </div>
  );
};

export default DealerHomePage;
