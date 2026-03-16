import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ClipboardList, FileText, TrendingUp, Package, Clock,
  Bell, Search, X, ChevronLeft, ChevronRight, Plus, ArrowRight,
  CreditCard, Zap, BarChart3, Eye, Home, Tag, User, Send, RefreshCw,
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

const statusConfig: Record<string, { ar: string; en: string; cls: string }> = {
  pending:    { ar: "قيد الانتظار", en: "Pending",    cls: "bg-amber-100 text-amber-800" },
  confirmed:  { ar: "مؤكد",        en: "Confirmed",  cls: "bg-blue-100 text-blue-800" },
  processing: { ar: "جاري التجهيز", en: "Processing", cls: "bg-primary/10 text-primary" },
  shipped:    { ar: "تم الشحن",    en: "Shipped",    cls: "bg-violet-100 text-violet-800" },
  delivered:  { ar: "تم التسليم",  en: "Delivered",  cls: "bg-emerald-100 text-emerald-800" },
  cancelled:  { ar: "ملغى",        en: "Cancelled",  cls: "bg-red-100 text-red-700" },
};

/* ─── Bottom Nav ─── */
const DealerHomeBottomNav = ({ isRTL }: { isRTL: boolean }) => {
  const navigate = useNavigate();
  const tabs = [
    { id: "home", label: isRTL ? "الرئيسية" : "Home", icon: Home, href: "/", active: true },
    { id: "products", label: isRTL ? "المنتجات" : "Products", icon: Package, href: "/products" },
    { id: "orders", label: isRTL ? "طلباتي" : "Orders", icon: ClipboardList, href: "/dealer?tab=orders" },
    { id: "offers", label: isRTL ? "العروض" : "Offers", icon: Tag, href: "/dealer?tab=offers" },
    { id: "account", label: isRTL ? "حسابي" : "Account", icon: User, href: "/dealer?tab=settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/50 lg:hidden shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.href)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px] ${
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
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);




  /* Search handler */
  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    setSearching(true); setShowResults(true);
    const { data } = await supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url")
      .eq("is_active", true).or(`name_ar.ilike.%${q.trim()}%,name_en.ilike.%${q.trim()}%,sku.ilike.%${q.trim()}%`).limit(8);
    setSearchResults((data as ProductItem[]) || []); setSearching(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => handleSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery, handleSearch]);

  /* Fetch data */
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [ordersRes, notifsRes, offersRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, status, total_amount, created_at").eq("user_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url").eq("is_active", true).eq("is_on_sale", true).limit(6),
      ]);
      const orders = ordersRes.data || [];
      setRecentOrders(orders.slice(0, 5));
      const { data: allOrders } = await supabase.from("orders").select("total_amount, status").eq("user_id", user.id).neq("status", "cancelled");
      setStats({
        totalOrders: (allOrders || []).length,
        pendingOrders: (allOrders || []).filter(o => ["pending", "confirmed"].includes(o.status)).length,
        totalSpent: (allOrders || []).reduce((s, o) => s + (o.total_amount || 0), 0),
        unreadNotifs: notifsRes.count || 0,
      });
      setOffers((offersRes.data as ProductItem[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const tierLabel = dealerAccount?.tier === "wholesale_tier1" ? (isRTL ? "جملة T1" : "Wholesale T1")
    : dealerAccount?.tier === "wholesale_tier2" ? (isRTL ? "جملة T2" : "Wholesale T2")
    : dealerAccount?.tier === "corporate" ? (isRTL ? "شركات" : "Corporate") : (isRTL ? "تجزئة" : "Retail");

  const handleAddToQuote = useCallback(async (product: ProductItem) => {
    if (!user) return;
    const existing = JSON.parse(sessionStorage.getItem("quote_pending_items") || "[]");
    if (!existing.find((p: any) => p.id === product.id)) {
      existing.push({ id: product.id, sku: product.sku, name_ar: product.name_ar, name_en: product.name_en });
      sessionStorage.setItem("quote_pending_items", JSON.stringify(existing));
    }
    // Record price view for "today's priced items"
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("dealer_price_views").upsert(
      { user_id: user.id, product_id: product.id, view_date: today },
      { onConflict: "user_id,product_id,view_date" }
    );
    toast({ title: "✅", description: isRTL ? `تم إضافة ${product.name_ar}` : `Added ${product.name_ar}` });
  }, [isRTL, toast, user]);

  /* Quick Order Table: update row */
  const updateQuickRow = (idx: number, field: keyof QuickOrderRow, value: string) => {
    setQuickRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addQuickRow = () => {
    setQuickRows(prev => [...prev, { sku: "", qty: "1" }]);
  };

  /* Quick Order: submit all rows */
  const handleQuickOrderSubmit = useCallback(async () => {
    const validRows = quickRows.filter(r => r.sku.trim());
    if (validRows.length === 0 || !user) return;
    setQuickOrderLoading(true);
    let addedCount = 0;
    const existing = JSON.parse(sessionStorage.getItem("quote_pending_items") || "[]");
    const today = new Date().toISOString().split("T")[0];

    for (const row of validRows) {
      const { data } = await supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url")
        .eq("is_active", true).ilike("sku", `%${row.sku.trim()}%`).limit(1);
      if (data && data.length > 0) {
        const product = data[0];
        const qty = parseInt(row.qty) || 1;
        const existingIdx = existing.findIndex((p: any) => p.id === product.id);
        if (existingIdx >= 0) {
          existing[existingIdx].qty = (existing[existingIdx].qty || 1) + qty;
        } else {
          existing.push({ id: product.id, sku: product.sku, name_ar: product.name_ar, name_en: product.name_en, qty });
        }
        // Record price view
        await supabase.from("dealer_price_views").upsert(
          { user_id: user.id, product_id: product.id, view_date: today },
          { onConflict: "user_id,product_id,view_date" }
        );
        addedCount++;
      }
    }
    sessionStorage.setItem("quote_pending_items", JSON.stringify(existing));
    if (addedCount > 0) {
      toast({ title: "✅", description: isRTL ? `تم إضافة ${addedCount} قطعة` : `${addedCount} items added` });
      setQuickRows([{ sku: "", qty: "1" }, { sku: "", qty: "1" }, { sku: "", qty: "1" }]);
    } else {
      toast({ title: "⚠️", description: isRTL ? "لم يتم العثور على أي قطعة" : "No parts found", variant: "destructive" });
    }
    setQuickOrderLoading(false);
  }, [quickRows, isRTL, toast, user]);

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="pt-14 md:pt-16 pb-24 lg:pb-6 min-h-screen bg-muted/20" dir={isRTL ? "rtl" : "ltr"}>

      {/* ━━━ SEARCH HERO ━━━ */}
      <div className="bg-card border-b border-border/30">
        <div className="container mx-auto px-4 pt-5 pb-5 md:pt-8 md:pb-6 max-w-3xl">
          {/* Welcome compact */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">{isRTL ? "بوابة التجار" : "Dealer Portal"}</p>
              <h1 className="text-xl md:text-2xl font-black text-foreground">{isRTL ? "ابحث واطلب بسرعة" : "Search & Order Fast"}</h1>
            </div>
            <Badge className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 px-2.5 py-1 shrink-0">{tierLabel}</Badge>
          </motion.div>

          {/* ━━━ LARGE SEARCH BAR ━━━ */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative">
            <div className={`relative flex items-center rounded-2xl border-2 transition-all duration-200 ${
              searchFocused ? "border-primary bg-background shadow-xl shadow-primary/8" : "border-border bg-background hover:border-primary/40"
            }`}>
              <Search className={`absolute w-5 h-5 transition-colors ${searchFocused ? "text-primary" : "text-muted-foreground/40"} ${isRTL ? 'right-4' : 'left-4'}`} />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { setSearchFocused(true); searchQuery.trim().length >= 2 && setShowResults(true); }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by Part Number or Product Name..."}
                className={`h-14 md:h-16 border-0 bg-transparent text-base md:text-lg shadow-none focus-visible:ring-0 font-medium ${isRTL ? 'pr-12 pl-10' : 'pl-12 pr-10'}`}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className={`absolute p-1.5 rounded-full hover:bg-muted ${isRTL ? 'left-3' : 'right-3'}`}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
              {isRTL ? "💡 ابحث برقم القطعة OEM للحصول على نتائج دقيقة وسريعة" : "💡 Search by OEM part number for fastest results"}
            </p>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showResults && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute z-50 w-full mt-1">
                  <Card className="shadow-2xl border-border/50 rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      {searching ? (
                        <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-8 text-center">
                          <Package className="w-8 h-8 text-muted-foreground/15 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">{isRTL ? "لا توجد نتائج" : "No results found"}</p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto divide-y divide-border/10">
                          {searchResults.map(p => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                              <div className="w-10 h-10 rounded-lg bg-muted/60 shrink-0 overflow-hidden flex items-center justify-center">
                                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-0.5" /> : <Package className="w-4 h-4 text-muted-foreground/30" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                                <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                              </div>
                              <Button size="sm" className="h-8 px-3 text-xs font-bold gap-1 shrink-0" onClick={() => handleAddToQuote(p)}>
                                <Plus className="w-3 h-3" />{isRTL ? "أضف" : "Add"}
                              </Button>
                            </div>
                          ))}
                          <button
                            onClick={() => { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setShowResults(false); setSearchQuery(""); }}
                            className="w-full py-3 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
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
      </div>

      <div className="container mx-auto px-4 py-5 space-y-5 max-w-3xl">

        {/* ━━━ QUICK ORDER TABLE ━━━ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/40 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-border/20">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">{isRTL ? "طلب سريع" : "Quick Order"}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={addQuickRow} className="h-7 text-xs text-primary hover:bg-primary/10 gap-1">
                <Plus className="w-3 h-3" />{isRTL ? "سطر" : "Row"}
              </Button>
            </div>
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_80px_52px] gap-2 px-4 py-2 bg-muted/30 border-b border-border/15 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>{isRTL ? "رقم القطعة" : "Part Number"}</span>
                <span className="text-center">{isRTL ? "الكمية" : "Qty"}</span>
                <span></span>
              </div>
              {/* Rows */}
              <div className="divide-y divide-border/10">
                {quickRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_52px] gap-2 px-4 py-2 items-center">
                    <Input
                      value={row.sku}
                      onChange={e => updateQuickRow(idx, "sku", e.target.value)}
                      placeholder={isRTL ? "مثال: 04152-YZZA1" : "e.g. 04152-YZZA1"}
                      className="h-10 text-sm font-mono bg-muted/20 border-border/40"
                      onKeyDown={e => e.key === "Enter" && handleQuickOrderSubmit()}
                    />
                    <Input
                      type="number"
                      value={row.qty}
                      onChange={e => updateQuickRow(idx, "qty", e.target.value)}
                      className="h-10 text-sm text-center bg-muted/20 border-border/40"
                      min="1"
                    />
                    {row.sku.trim() ? (
                      <button onClick={() => setQuickRows(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <X className="w-4 h-4" />
                      </button>
                    ) : <div />}
                  </div>
                ))}
              </div>
              {/* Submit */}
              <div className="px-4 py-3 bg-muted/20 border-t border-border/20 flex items-center justify-between gap-3">
                <button onClick={() => navigate("/dealer?tab=quotes")} className="text-xs text-primary font-semibold hover:underline">
                  {isRTL ? "فتح منشئ عروض الأسعار ←" : "Open Quote Builder →"}
                </button>
                <Button onClick={handleQuickOrderSubmit} disabled={quickOrderLoading || !quickRows.some(r => r.sku.trim())} className="h-10 px-5 gap-2 font-bold text-sm">
                  {quickOrderLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isRTL ? "إضافة للطلب" : "Add to Cart"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* ━━━ RECENT ORDERS ━━━ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">{isRTL ? "آخر الطلبات" : "Recent Orders"}</h2>
            <Link to="/dealer?tab=orders">
              <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold h-7 px-2 gap-1 hover:bg-primary/5">
                {isRTL ? "عرض الكل" : "View All"}<ArrowIcon className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : recentOrders.length === 0 ? (
            <Card className="border-border/30 rounded-xl">
              <CardContent className="p-8 text-center">
                <Package className="w-10 h-10 text-muted-foreground/10 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">{isRTL ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                <Link to="/dealer?tab=quotes">
                  <Button className="gap-2 h-10"><ShoppingCart className="w-4 h-4" />{isRTL ? "اطلب الآن" : "Order Now"}</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order, i) => {
                const st = statusConfig[order.status] || statusConfig.pending;
                return (
                  <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.04 }}>
                    <Card className="border-border/20 rounded-xl overflow-hidden hover:border-primary/15 transition-all hover:shadow-sm">
                      <CardContent className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-foreground">#{order.order_number}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{isRTL ? st.ar : st.en}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-sm font-black text-foreground">{order.total_amount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{isRTL ? "ج.م" : "EGP"}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1 shrink-0 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground">
                          <RefreshCw className="w-3 h-3" />{isRTL ? "أعد" : "Reorder"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* ━━━ OFFERS ━━━ */}
        {offers.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                {isRTL ? "عروض حصرية" : "Exclusive Offers"}
              </h2>
              <Link to="/dealer?tab=offers">
                <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold h-7 px-2 gap-1 hover:bg-primary/5">
                  {isRTL ? "الكل" : "All"}<ArrowIcon className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {offers.slice(0, 6).map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.03 }}>
                  <Card className="border-border/20 rounded-xl overflow-hidden group hover:border-primary/20 hover:shadow-md transition-all">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-background relative overflow-hidden flex items-center justify-center">
                        {p.image_url ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        : <Package className="w-8 h-8 text-muted-foreground/10" />}
                        {p.sale_price && (
                          <span className="absolute top-2 left-2 text-[9px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-md">
                            {isRTL ? "عرض" : "SALE"}
                          </span>
                        )}
                      </div>
                      <div className="p-3 border-t border-border/15">
                        <p className="text-xs font-semibold text-foreground line-clamp-1 mb-0.5">{p.name_ar}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mb-2">{p.sku}</p>
                        <Button size="sm" className="w-full h-8 text-xs font-bold gap-1" onClick={() => handleAddToQuote(p)}>
                          <Plus className="w-3 h-3" />{isRTL ? "أضف للطلب" : "Add to Cart"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ━━━ STATISTICS — Below main actions ━━━ */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <h2 className="text-sm font-bold text-foreground mb-3">{isRTL ? "نظرة عامة" : "Overview"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: isRTL ? "إجمالي الطلبات" : "Total Orders", value: stats.totalOrders, icon: BarChart3, color: "text-primary" },
              { label: isRTL ? "طلبات معلّقة" : "Pending", value: stats.pendingOrders, icon: Clock, color: "text-amber-600" },
              { label: isRTL ? "إجمالي المشتريات" : "Total Spent", value: `${(stats.totalSpent / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-emerald-600" },
              { label: isRTL ? "إشعارات" : "Notifications", value: stats.unreadNotifs, icon: Bell, color: "text-blue-600" },
            ].map((s, i) => (
              <Card key={i} className="border-border/20 rounded-xl">
                <CardContent className="p-4 text-center">
                  {loading ? <Skeleton className="h-14 rounded" /> : (
                    <>
                      <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                      <p className="text-xl font-black text-foreground leading-none">{s.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* ━━━ QUICK ACCESS ━━━ */}
        <section className="grid grid-cols-2 gap-2.5">
          {[
            { icon: FileText, label: isRTL ? "كشوفات الأسعار" : "Price Lists", href: "/dealer?tab=price_lists" },
            { icon: CreditCard, label: isRTL ? "الدفع الإلكتروني" : "Payment", href: "/dealer?tab=payment" },
          ].map((a) => (
            <Link key={a.href} to={a.href}>
              <Card className="border-border/20 rounded-xl hover:border-primary/20 hover:shadow-sm transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <a.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{a.label}</span>
                  <ArrowIcon className="w-4 h-4 text-muted-foreground ms-auto" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </div>

      {/* ━━━ BOTTOM NAVIGATION ━━━ */}
      <DealerHomeBottomNav isRTL={isRTL} />
    </div>
  );
};

export default DealerHomePage;
