import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ClipboardList, FileText, Package,
  Search, X, ChevronLeft, ChevronRight, Plus, ArrowRight,
  CreditCard, Home, Tag, User, RefreshCw, Percent, Receipt,
  Sparkles, CheckCircle2, XCircle, Download,
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
import dealerQuotesIcon from "@/assets/dealer-quotes-icon.png";

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

/* ─── Bottom Nav ─── */
const DealerHomeBottomNav = ({ isRTL }: { isRTL: boolean }) => {
  const navigate = useNavigate();
  const tabs = [
    { id: "home", label: isRTL ? "الرئيسية" : "Home", icon: Home, href: "/", active: true },
    { id: "products", label: isRTL ? "المنتجات" : "Products", icon: Package, href: "/products" },
    { id: "orders", label: isRTL ? "طلباتي" : "Orders", icon: ClipboardList, href: "/dealer?tab=orders" },
    { id: "statements", label: isRTL ? "الحساب" : "Statements", icon: Receipt, href: "/dealer?tab=statement" },
    { id: "account", label: isRTL ? "حسابي" : "Account", icon: User, href: "/dealer?tab=settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/40 lg:hidden">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.href)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-[48px] ${
              tab.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-5 h-5" strokeWidth={tab.active ? 2.5 : 1.8} />
            <span className={`text-[10px] leading-tight ${tab.active ? "font-bold" : "font-medium"}`}>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

/* ─── Section Header ─── */
const SectionHeader = ({ title, linkTo, linkLabel, icon: Icon, isRTL }: { title: string; linkTo?: string; linkLabel?: string; icon?: any; isRTL: boolean }) => {
  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        {title}
      </h2>
      {linkTo && (
        <Link to={linkTo}>
          <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold h-7 px-2 gap-1 hover:bg-primary/5">
            {linkLabel || (isRTL ? "عرض الكل" : "View All")}<ArrowIcon className="w-3.5 h-3.5" />
          </Button>
        </Link>
      )}
    </div>
  );
};

/* ─── Stock Badge ─── */
const StockBadge = ({ qty, isRTL }: { qty: number; isRTL: boolean }) => {
  if (qty > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md">
        <CheckCircle2 className="w-3 h-3" />
        {isRTL ? "متوفر" : "In Stock"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">
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

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const DAILY_PRICE_LIMIT = 20;

  /* Search handler — includes stock_quantity + price */
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

  /* Fetch daily view count */
  const refreshDailyCount = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_daily_view_count", { _user_id: user.id });
    setDailyViewCount(typeof data === "number" ? data : 0);
  }, [user]);

  /* Fetch data */
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

  /* Price a product — records in dealer_price_views with 20 daily limit */
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

  /* Add to order (quote session) */
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

  return (
    <div className="pt-14 md:pt-16 pb-24 lg:pb-6 min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1️⃣ SEARCH — TOP PRIORITY
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-gradient-to-b from-secondary to-secondary/95">
        <div className="container mx-auto px-4 pt-6 pb-7 md:pt-10 md:pb-8 max-w-3xl">
          {/* Welcome row */}
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
            <div>
              <p className="text-secondary-foreground/60 text-[11px] font-medium tracking-widest uppercase mb-0.5">
                {isRTL ? "بوابة التجار" : "Dealer Portal"}
              </p>
              <h1 className="text-xl md:text-2xl font-black text-secondary-foreground">
                {isRTL ? "ابحث واطلب بسرعة" : "Search & Order Fast"}
              </h1>
            </div>
            <Badge className="text-[10px] font-bold bg-primary text-primary-foreground border-0 px-3 py-1.5 rounded-lg shadow-lg shadow-primary/30">
              {tierLabel}
            </Badge>
          </motion.div>

          {/* SEARCH BAR */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative">
            <div className={`relative flex items-center rounded-2xl transition-all duration-200 ${
              searchFocused
                ? "bg-background shadow-2xl shadow-primary/10 ring-2 ring-primary/40"
                : "bg-background/95 shadow-lg hover:shadow-xl"
            }`}>
              <Search className={`absolute w-5 h-5 transition-colors ${searchFocused ? "text-primary" : "text-muted-foreground/50"} ${isRTL ? 'right-4' : 'left-4'}`} />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { setSearchFocused(true); searchQuery.trim().length >= 2 && setShowResults(true); }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by Part Number or Product Name..."}
                className={`h-14 md:h-16 border-0 bg-transparent text-base md:text-lg shadow-none focus-visible:ring-0 font-medium placeholder:text-muted-foreground/40 ${isRTL ? 'pr-12 pl-10' : 'pl-12 pr-10'}`}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className={`absolute p-1.5 rounded-full hover:bg-muted ${isRTL ? 'left-3' : 'right-3'}`}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Daily limit + hint chips */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-secondary-foreground/40 text-[10px] shrink-0">💡</span>
              {[
                isRTL ? "رقم القطعة OEM" : "OEM Part #",
                isRTL ? "فلتر زيت" : "Oil Filter",
                isRTL ? "بواجي" : "Spark Plugs",
              ].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setSearchQuery(hint)}
                  className="text-[10px] text-secondary-foreground/50 bg-secondary-foreground/8 hover:bg-secondary-foreground/15 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium"
                >
                  {hint}
                </button>
              ))}
              </div>
              <span className={`text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-md ${
                dailyViewCount >= DAILY_PRICE_LIMIT
                  ? "text-destructive bg-destructive/10"
                  : "text-secondary-foreground/50 bg-secondary-foreground/8"
              }`}>
                {dailyViewCount}/{DAILY_PRICE_LIMIT} {isRTL ? "تسعير" : "priced"}
              </span>
            </div>

            {/* ━━━ Search Results Dropdown ━━━ */}
            <AnimatePresence>
              {showResults && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute z-50 w-full mt-2">
                  <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                      {searching ? (
                        <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-10 text-center">
                          <Search className="w-8 h-8 text-muted-foreground/10 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">{isRTL ? "لا توجد نتائج" : "No results found"}</p>
                        </div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto">
                          {searchResults.map((p, idx) => {
                            const stock = p.stock_quantity ?? 0;
                            return (
                              <div
                                key={p.id}
                                className={`flex items-start gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer ${
                                  idx !== searchResults.length - 1 ? "border-b border-border/10" : ""
                                }`}
                              >
                                <div className="w-12 h-12 rounded-xl bg-muted/50 shrink-0 overflow-hidden flex items-center justify-center">
                                  {p.image_url
                                    ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-1" />
                                    : <Package className="w-5 h-5 text-muted-foreground/20" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {isRTL ? p.name_ar : (p.name_en || p.name_ar)}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-xs font-black text-foreground">
                                      {(p.sale_price || p.base_price).toLocaleString()} <span className="text-[10px] font-medium text-muted-foreground">{isRTL ? "ج.م" : "EGP"}</span>
                                    </span>
                                    {p.sale_price && p.sale_price < p.base_price && (
                                      <span className="text-[10px] text-muted-foreground line-through">{p.base_price.toLocaleString()}</span>
                                    )}
                                    <StockBadge qty={stock} isRTL={isRTL} />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0 mt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-[11px] font-bold gap-1 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => handlePriceItem(p)}
                                  >
                                    <Tag className="w-3 h-3" />{isRTL ? "تسعير" : "Price"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-8 px-2.5 text-[11px] font-bold gap-1 rounded-lg"
                                    onClick={() => handleAddToOrder(p)}
                                    disabled={stock === 0}
                                  >
                                    <Plus className="w-3 h-3" />{isRTL ? "أضف" : "Add"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            onClick={() => { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setShowResults(false); setSearchQuery(""); }}
                            className="w-full py-3.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {isRTL ? "عرض كل النتائج" : "View all results"}
                            <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
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

      <div className="container mx-auto px-4 py-5 space-y-6 max-w-3xl">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            🔖 QUICK ACCESS — PRICE QUOTES
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Link to="/dealer?tab=quotes">
            <Card className="border-border/15 rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all duration-200 group cursor-pointer overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{isRTL ? "عروض الأسعار" : "Price Quotes"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isRTL
                      ? `الأصناف التي تم تسعيرها اليوم (${dailyViewCount})`
                      : `Items priced today (${dailyViewCount})`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {dailyViewCount > 0 && (
                    <Badge className="text-[10px] font-black bg-primary/10 text-primary border-0 px-2.5 py-1 rounded-lg">
                      {dailyViewCount}
                    </Badge>
                  )}
                  {isRTL
                    ? <ChevronLeft className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    : <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  }
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            2️⃣ PRICE OFFERS — SECOND PRIORITY
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {loading ? (
          <div>
            <Skeleton className="h-5 w-32 mb-3 rounded" />
            <div className="grid grid-cols-2 gap-2.5">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          </div>
        ) : offers.length > 0 ? (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <SectionHeader
              title={isRTL ? "عروض الأسعار" : "Price Offers"}
              linkTo="/dealer?tab=offers"
              linkLabel={isRTL ? "كل العروض" : "All Offers"}
              icon={Sparkles}
              isRTL={isRTL}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {offers.slice(0, 6).map((p, i) => {
                const discount = getDiscount(p);
                const stock = p.stock_quantity ?? 0;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
                    <Card className="border-border/15 rounded-2xl overflow-hidden group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-0">
                        <div className="aspect-square bg-muted/20 relative overflow-hidden flex items-center justify-center">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                            : <Package className="w-10 h-10 text-muted-foreground/10" />}
                          {discount && (
                            <span className="absolute top-2 left-2 text-[10px] font-black bg-destructive text-destructive-foreground px-2 py-1 rounded-lg">
                              -{discount}%
                            </span>
                          )}
                          {stock > 0 ? (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" title={isRTL ? "متوفر" : "In Stock"} />
                          ) : (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-destructive/60 ring-2 ring-card" title={isRTL ? "غير متوفر" : "Out of Stock"} />
                          )}
                        </div>
                        <div className="p-3 border-t border-border/10">
                          <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mb-1.5">{p.sku}</p>
                          {/* Price row */}
                          <div className="flex items-baseline gap-1.5 mb-2.5">
                            <span className="text-sm font-black text-foreground">{(p.sale_price || p.base_price).toLocaleString()}</span>
                            {p.sale_price && p.sale_price < p.base_price && (
                              <span className="text-[10px] text-muted-foreground line-through">{p.base_price.toLocaleString()}</span>
                            )}
                            <span className="text-[9px] text-muted-foreground">{isRTL ? "ج.م" : "EGP"}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-[11px] font-bold gap-1 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                              onClick={() => handlePriceItem(p)}
                            >
                              <Tag className="w-3 h-3" />{isRTL ? "تسعير" : "Price"}
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-[11px] font-bold gap-1 rounded-lg"
                              onClick={() => handleAddToOrder(p)}
                              disabled={stock === 0}
                            >
                              <Plus className="w-3 h-3" />{isRTL ? "أضف" : "Add"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        ) : null}


        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            4️⃣ STATEMENTS — FOURTH PRIORITY
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <SectionHeader
            title={isRTL ? "كشف الحساب والمدفوعات" : "Statements & Payments"}
            isRTL={isRTL}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                icon: Receipt,
                label: isRTL ? "كشف الحساب" : "Account Statement",
                desc: isRTL ? "رصيدك وحركات الحساب" : "Balance & transactions",
                href: "/dealer?tab=statement",
              },
              {
                icon: FileText,
                label: isRTL ? "الفواتير" : "Invoices",
                desc: isRTL ? "عرض وتحميل الفواتير" : "View & download invoices",
                href: "/dealer?tab=orders",
              },
              {
                icon: CreditCard,
                label: isRTL ? "الدفع الإلكتروني" : "Make Payment",
                desc: isRTL ? "سدد مستحقاتك أونلاين" : "Pay invoices online",
                href: "/dealer?tab=payment",
              },
            ].map((item, i) => (
              <Link key={item.href + item.label} to={item.href}>
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }}>
                  <Card className="border-border/15 rounded-2xl hover:border-primary/20 hover:shadow-md transition-all duration-200 group cursor-pointer h-full">
                    <CardContent className="p-4 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>
                      {isRTL
                        ? <ChevronLeft className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                      }
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      </div>

      {/* ━━━ BOTTOM NAVIGATION ━━━ */}
      <DealerHomeBottomNav isRTL={isRTL} />
    </div>
  );
};

export default DealerHomePage;
