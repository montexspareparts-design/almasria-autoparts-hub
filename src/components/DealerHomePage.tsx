import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ClipboardList, FileText, Package,
  Search, X, ChevronLeft, ChevronRight, Plus, ArrowRight,
  CreditCard, Home, Tag, User, RefreshCw, Percent, Receipt,
  Sparkles, CheckCircle2, XCircle, Download, Truck, Upload, Zap,
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

/* ─── Types ─── */
interface OrderSummary { id: string; order_number: string; status: string; total_amount: number; created_at: string; }
interface ProductItem { id: string; name_ar: string; name_en: string | null; sku: string; base_price: number; sale_price: number | null; image_url: string | null; stock_quantity?: number; brand?: string; }

const statusConfig: Record<string, { ar: string; en: string; cls: string }> = {
  pending:    { ar: "قيد الانتظار", en: "Pending",    cls: "bg-amber-500/10 text-amber-700 border border-amber-200" },
  confirmed:  { ar: "مؤكد",        en: "Confirmed",  cls: "bg-blue-500/10 text-blue-700 border border-blue-200" },
  processing: { ar: "جاري التجهيز", en: "Processing", cls: "bg-primary/10 text-primary border border-primary/20" },
  shipped:    { ar: "تم الشحن",    en: "Shipped",    cls: "bg-violet-500/10 text-violet-700 border border-violet-200" },
  delivered:  { ar: "تم التسليم",  en: "Delivered",  cls: "bg-emerald-500/10 text-emerald-700 border border-emerald-200" },
  cancelled:  { ar: "ملغى",        en: "Cancelled",  cls: "bg-destructive/10 text-destructive border border-destructive/20" },
};

/* ─── Glass Card Wrapper ─── */
const GlassCard = ({ children, className = "", onClick, as: Tag = "div" }: {
  children: React.ReactNode; className?: string; onClick?: () => void; as?: any;
}) => (
  <Tag
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-[20px]
      bg-white/[0.55] dark:bg-white/[0.08]
      backdrop-blur-xl
      border border-white/30 dark:border-white/10
      shadow-[0_8px_32px_rgba(0,0,0,0.06)]
      transition-all duration-300
      hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]
      hover:scale-[1.02]
      active:scale-[0.98]
      ${className}
    `}
  >
    {children}
  </Tag>
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
      <div className="mx-3 mb-3 rounded-2xl bg-white/70 dark:bg-black/50 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.href)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[52px] ${
                tab.active
                  ? "text-primary bg-primary/10 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" strokeWidth={tab.active ? 2.5 : 1.8} />
              <span className={`text-[10px] leading-tight ${tab.active ? "font-bold" : "font-medium"}`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

/* ─── Stock Badge ─── */
const StockBadge = ({ qty, isRTL }: { qty: number; isRTL: boolean }) => {
  if (qty > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        {isRTL ? "متوفر" : "In Stock"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" />
      {isRTL ? "غير متوفر" : "Out of Stock"}
    </span>
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
      toast({
        title: isRTL ? "⚠️ تم الوصول للحد اليومي" : "⚠️ Daily limit reached",
        description: isRTL ? `الحد الأقصى ${DAILY_PRICE_LIMIT} صنف يومياً` : `Maximum ${DAILY_PRICE_LIMIT} items per day`,
        variant: "destructive",
      });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("dealer_price_views").upsert(
      { user_id: user.id, product_id: product.id, view_date: today },
      { onConflict: "user_id,product_id,view_date" }
    );
    if (!error) {
      await refreshDailyCount();
      toast({ title: "✅", description: isRTL ? `تم تسعير ${product.name_ar}` : `Priced ${product.name_ar}` });
    }
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

  return (
    <div className="pt-14 md:pt-16 pb-28 lg:pb-6 min-h-screen relative overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>

      {/* ━━━ Ambient Background ━━━ */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900" />
        {/* Floating orbs */}
        <div className="absolute top-20 -right-20 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[100px] animate-pulse" />
        <div className="absolute bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-blue-400/[0.05] blur-[80px]" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-violet-300/[0.04] blur-[60px]" />
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1️⃣ HERO SEARCH SECTION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative">
        {/* Glass header bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/90 via-secondary/70 to-transparent backdrop-blur-sm" />
        
        <div className="relative container mx-auto px-4 pt-6 pb-10 md:pt-10 md:pb-12 max-w-3xl">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <p className="text-secondary-foreground/50 text-[10px] font-semibold tracking-[0.2em] uppercase mb-1">
                {isRTL ? "بوابة التجار" : "Dealer Portal"}
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-secondary-foreground">
                {isRTL ? "ابحث واطلب بسرعة" : "Search & Order Fast"}
              </h1>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Badge className="text-[10px] font-bold bg-primary text-primary-foreground border-0 px-3.5 py-1.5 rounded-xl shadow-lg shadow-primary/25">
                {tierLabel}
              </Badge>
            </motion.div>
          </motion.div>

          {/* GLASS SEARCH BAR */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className={`
              relative flex items-center rounded-2xl transition-all duration-300
              bg-white/60 dark:bg-white/10
              backdrop-blur-2xl
              border border-white/40 dark:border-white/15
              ${searchFocused
                ? "shadow-[0_16px_48px_rgba(0,0,0,0.1),0_0_0_2px_hsl(var(--primary)/0.3)] scale-[1.01]"
                : "shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
              }
            `}>
              <Search className={`absolute w-5 h-5 transition-all duration-200 ${
                searchFocused ? "text-primary scale-110" : "text-muted-foreground/40"
              } ${isRTL ? 'right-5' : 'left-5'}`} />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { setSearchFocused(true); searchQuery.trim().length >= 2 && setShowResults(true); }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by Part Number or Product Name..."}
                className={`h-14 md:h-16 border-0 bg-transparent text-base md:text-lg shadow-none focus-visible:ring-0 font-medium placeholder:text-muted-foreground/35 ${isRTL ? 'pr-13 pl-10' : 'pl-13 pr-10'}`}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className={`absolute p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${isRTL ? 'left-3' : 'right-3'}`}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Chips + counter */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  isRTL ? "قطع المحرك" : "Engine Parts",
                  isRTL ? "الفلاتر" : "Filters",
                  isRTL ? "العفشة" : "Suspension",
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setSearchQuery(hint)}
                    className="text-[10px] text-secondary-foreground/50 bg-white/30 dark:bg-white/10 backdrop-blur-sm hover:bg-white/50 dark:hover:bg-white/15 px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-semibold border border-white/20"
                  >
                    {hint}
                  </button>
                ))}
              </div>
              <span className={`text-[10px] font-bold shrink-0 px-2.5 py-1 rounded-full backdrop-blur-sm ${
                dailyViewCount >= DAILY_PRICE_LIMIT
                  ? "text-destructive bg-destructive/10 border border-destructive/20"
                  : "text-secondary-foreground/50 bg-white/20 border border-white/20"
              }`}>
                {dailyViewCount}/{DAILY_PRICE_LIMIT} {isRTL ? "تسعير" : "priced"}
              </span>
            </div>

            {/* Search Results — Glass Dropdown */}
            <AnimatePresence>
              {showResults && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute z-50 w-full mt-3"
                >
                  <div className="rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
                    {searching ? (
                      <div className="p-4 space-y-2.5">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-black/[0.04]" />)}
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                          <Search className="w-6 h-6 text-muted-foreground/20" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{isRTL ? "لا توجد نتائج" : "No results found"}</p>
                      </div>
                    ) : (
                      <div className="max-h-[420px] overflow-y-auto">
                        {searchResults.map((p, idx) => {
                          const stock = p.stock_quantity ?? 0;
                          return (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className={`flex items-start gap-3 px-4 py-3.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-pointer ${
                                idx !== searchResults.length - 1 ? "border-b border-black/[0.04] dark:border-white/[0.06]" : ""
                              }`}
                            >
                              <div className="w-12 h-12 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur-sm shrink-0 overflow-hidden flex items-center justify-center border border-white/20">
                                {p.image_url
                                  ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-1" />
                                  : <Package className="w-5 h-5 text-muted-foreground/20" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</p>
                                <div className="mt-1.5"><StockBadge qty={stock} isRTL={isRTL} /></div>
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0 mt-1">
                                <Button size="sm" variant="outline" className="h-8 px-2.5 text-[11px] font-bold gap-1 rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground backdrop-blur-sm" onClick={() => handlePriceItem(p)}>
                                  <Tag className="w-3 h-3" />{isRTL ? "تسعير" : "Price"}
                                </Button>
                                <Button size="sm" className="h-8 px-2.5 text-[11px] font-bold gap-1 rounded-xl shadow-sm" onClick={() => handleAddToOrder(p)} disabled={stock === 0}>
                                  <Plus className="w-3 h-3" />{isRTL ? "أضف" : "Add"}
                                </Button>
                              </div>
                            </motion.div>
                          );
                        })}
                        <button
                          onClick={() => { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setShowResults(false); setSearchQuery(""); }}
                          className="w-full py-4 text-sm font-bold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 border-t border-black/[0.04]"
                        >
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
      </div>

      {/* ━━━ Content ━━━ */}
      <div className="container mx-auto px-4 py-6 space-y-5 max-w-3xl">

        {/* ━━━ Quick Actions — 3 Glass Cards ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-3 gap-3"
        >
          {/* عروض الأسعار */}
          <Link to="/dealer?tab=quotes" className="block">
            <GlassCard className="p-4 md:p-5 flex flex-col items-center text-center gap-3 h-full group cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <img src={dealerQuotesIcon} alt="عروض الأسعار" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-foreground leading-tight">{isRTL ? "عروض الأسعار" : "Quotes"}</p>
                {dailyViewCount > 0 && (
                  <span className="inline-block mt-1.5 text-[9px] font-bold bg-primary/10 text-primary backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {dailyViewCount} {isRTL ? "تسعير" : "priced"}
                  </span>
                )}
              </div>
            </GlassCard>
          </Link>

          {/* كشوفات المصرية */}
          <Link to="/dealer?tab=price_lists" className="block">
            <GlassCard className="p-4 md:p-5 flex flex-col items-center text-center gap-3 h-full group cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-foreground leading-tight">{isRTL ? "كشوفات المصرية" : "Price Lists"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isRTL ? "الأسعار المحدثة" : "Updated"}</p>
              </div>
            </GlassCard>
          </Link>

          {/* طلباتي */}
          <Link to="/dealer?tab=orders" className="block">
            <GlassCard className="p-4 md:p-5 flex flex-col items-center text-center gap-3 h-full group cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <img src={dealerOrdersIcon} alt="طلباتي" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-foreground leading-tight">{isRTL ? "طلباتي" : "Orders"}</p>
                {activeOrders > 0 ? (
                  <span className="inline-block mt-1.5 text-[9px] font-bold bg-amber-100/80 text-amber-700 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {activeOrders} {isRTL ? "جارية" : "active"}
                  </span>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{isRTL ? "تتبع طلباتك" : "Track orders"}</p>
                )}
              </div>
            </GlassCard>
          </Link>
        </motion.div>

        {/* ━━━ Offers Section ━━━ */}
        {loading ? (
          <div>
            <Skeleton className="h-5 w-32 mb-3 rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-56 rounded-[20px]" />)}
            </div>
          </div>
        ) : offers.length > 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {isRTL ? "عروض الأسعار" : "Price Offers"}
              </h2>
              <Link to="/dealer?tab=offers">
                <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold h-7 px-2 gap-1 hover:bg-primary/5 rounded-xl">
                  {isRTL ? "كل العروض" : "All Offers"}
                  {isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
                    transition={{ delay: 0.18 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <GlassCard className="overflow-hidden group cursor-pointer">
                      <div className="aspect-square bg-gradient-to-br from-white/40 to-white/10 dark:from-white/5 dark:to-transparent relative overflow-hidden flex items-center justify-center">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                          : <Package className="w-10 h-10 text-muted-foreground/10" />}
                        {discount && (
                          <span className="absolute top-2.5 left-2.5 text-[10px] font-black bg-destructive/90 text-destructive-foreground px-2 py-1 rounded-xl backdrop-blur-sm shadow-sm">
                            -{discount}%
                          </span>
                        )}
                        {stock > 0 ? (
                          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white/50 shadow-sm shadow-emerald-500/30" />
                        ) : (
                          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-destructive/60 ring-2 ring-white/50" />
                        )}
                      </div>
                      <div className="p-3 border-t border-white/10">
                        <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mb-2">{p.sku}</p>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] font-bold gap-1 rounded-xl border-white/20 text-primary hover:bg-primary hover:text-primary-foreground backdrop-blur-sm" onClick={() => handlePriceItem(p)}>
                            <Tag className="w-3 h-3" />{isRTL ? "تسعير" : "Price"}
                          </Button>
                          <Button size="sm" className="flex-1 h-8 text-[11px] font-bold gap-1 rounded-xl shadow-sm shadow-primary/20" onClick={() => handleAddToOrder(p)} disabled={stock === 0}>
                            <Plus className="w-3 h-3" />{isRTL ? "أضف" : "Add"}
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        ) : null}

        {/* ━━━ Account & Payments — Glass List ━━━ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-sm font-bold text-foreground mb-3 px-1">
            {isRTL ? "الحساب والمدفوعات" : "Account & Payments"}
          </h2>
          <GlassCard className="divide-y divide-white/10 dark:divide-white/5">
            {[
              {
                icon: CreditCard,
                label: isRTL ? "الدفع الإلكتروني" : "Make Payment",
                desc: isRTL ? "سدد مستحقاتك أونلاين" : "Pay invoices online",
                href: "/dealer?tab=payment",
                gradient: "from-emerald-500/15 to-emerald-500/5",
                iconColor: "text-emerald-600",
              },
              {
                icon: FileText,
                label: isRTL ? "الفواتير" : "Invoices",
                desc: isRTL ? "عرض وتحميل الفواتير" : "View & download invoices",
                href: "/dealer?tab=invoices",
                gradient: "from-blue-500/15 to-blue-500/5",
                iconColor: "text-blue-600",
              },
              {
                icon: Truck,
                label: isRTL ? "تتبع الشحنات" : "Track Shipments",
                desc: isRTL ? "تتبع حالة شحناتك" : "Track your shipments",
                href: "/dealer?tab=orders",
                gradient: "from-orange-500/15 to-orange-500/5",
                iconColor: "text-orange-600",
              },
              {
                icon: Receipt,
                label: isRTL ? "كشف الحساب" : "Account Statement",
                desc: isRTL ? "رصيدك وحركات الحساب" : "Balance & transactions",
                href: "/dealer?tab=statement",
                gradient: "from-violet-500/15 to-violet-500/5",
                iconColor: "text-violet-600",
              },
            ].map((item, i) => (
              <Link key={item.href + item.label} to={item.href}>
                <motion.div
                  initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + i * 0.05 }}
                  className="flex items-center gap-4 p-4 hover:bg-white/20 dark:hover:bg-white/[0.03] transition-all duration-200 group cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className={`w-5.5 h-5.5 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  {isRTL
                    ? <ChevronLeft className="w-5 h-5 text-muted-foreground/15 group-hover:text-primary group-hover:translate-x-[-4px] transition-all duration-200 shrink-0" />
                    : <ChevronRight className="w-5 h-5 text-muted-foreground/15 group-hover:text-primary group-hover:translate-x-[4px] transition-all duration-200 shrink-0" />
                  }
                </motion.div>
              </Link>
            ))}
          </GlassCard>
        </motion.section>
      </div>

      {/* ━━━ BOTTOM NAVIGATION ━━━ */}
      <DealerHomeBottomNav isRTL={isRTL} />
    </div>
  );
};

export default DealerHomePage;
