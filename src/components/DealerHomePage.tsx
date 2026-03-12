import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ClipboardList, FileText, TrendingUp, Package, Clock,
  Bell, Search, X, ChevronLeft, ChevronRight, Plus, ArrowRight,
  CreditCard, Zap, BarChart3, Eye,
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

  /* Search */
  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    setSearching(true); setShowResults(true);
    const { data } = await supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url")
      .eq("is_active", true).or(`name_ar.ilike.%${q.trim()}%,name_en.ilike.%${q.trim()}%,sku.ilike.%${q.trim()}%`).limit(6);
    setSearchResults((data as ProductItem[]) || []); setSearching(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => handleSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery, handleSearch]);

  /* Data */
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [ordersRes, notifsRes, offersRes, popularRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, status, total_amount, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url").eq("is_active", true).eq("is_on_sale", true).limit(6),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url, brand, stock_quantity").eq("is_active", true).gt("stock_quantity", 20).order("stock_quantity", { ascending: false }).limit(8),
      ]);
      const orders = ordersRes.data || [];
      setRecentOrders(orders.slice(0, 5));
      setStats({ totalOrders: orders.length, pendingOrders: orders.filter(o => ["pending", "confirmed"].includes(o.status)).length, totalSpent: orders.reduce((s, o) => s + (o.total_amount || 0), 0), unreadNotifs: notifsRes.count || 0 });
      setOffers((offersRes.data as ProductItem[]) || []);
      setPopularProducts(((popularRes.data as any[]) || []).sort(() => Math.random() - 0.5).map(p => ({ id: p.id, name_ar: p.name_ar, name_en: p.name_en, sku: p.sku, base_price: p.base_price, sale_price: p.sale_price, image_url: p.image_url, brand: p.brand })));
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      const { data: allOrders } = await supabase.from("orders").select("total_amount").eq("user_id", user.id);
      setStats(prev => ({ ...prev, totalOrders: count || 0, totalSpent: allOrders?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0 }));
    })();
  }, [user]);

  const tierLabel = dealerAccount?.tier === "wholesale_tier1" ? (isRTL ? "تاجر جملة - الدرجة الأولى" : "Wholesale Tier 1")
    : dealerAccount?.tier === "wholesale_tier2" ? (isRTL ? "تاجر جملة - الدرجة الثانية" : "Wholesale Tier 2")
    : dealerAccount?.tier === "corporate" ? (isRTL ? "شركات" : "Corporate") : (isRTL ? "تجزئة" : "Retail");

  const handleAddToQuote = useCallback((product: ProductItem) => {
    const existing = JSON.parse(sessionStorage.getItem("quote_pending_items") || "[]");
    if (!existing.find((p: any) => p.id === product.id)) {
      existing.push({ id: product.id, sku: product.sku, name_ar: product.name_ar, name_en: product.name_en });
      sessionStorage.setItem("quote_pending_items", JSON.stringify(existing));
    }
    toast({ title: "✅ " + (isRTL ? "تمت الإضافة" : "Added"), description: product.name_ar });
  }, [isRTL, toast]);

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  /* ─── Render ─── */
  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>

      {/* ━━━ HERO HEADER ━━━ */}
      <div className="bg-card border-b border-border/40">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <motion.div initial={{ opacity: 0, x: isRTL ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-xs text-muted-foreground mb-1">{isRTL ? "بوابة التجار" : "Dealer Portal"}</p>
              <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">{isRTL ? "مرحباً بك 👋" : "Welcome back 👋"}</h1>
              <Badge className="mt-2 text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5">{tierLabel}</Badge>
            </motion.div>

            {/* Search */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative w-full md:w-96">
              <div className="relative flex items-center bg-background rounded-lg border border-border hover:border-primary/30 transition-colors">
                <Search className={`absolute w-4 h-4 text-muted-foreground/50 ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                  placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by SKU or name..."}
                  className={`h-10 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 ${isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'}`} />
                {searchQuery && <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className={`absolute p-1 rounded-full hover:bg-muted ${isRTL ? 'left-2' : 'right-2'}`}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
              </div>
              <AnimatePresence>
                {showResults && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute z-50 w-full mt-1">
                    <Card className="shadow-2xl border-border/50 rounded-lg overflow-hidden">
                      <CardContent className="p-0">
                        {searching ? <div className="p-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-9 rounded" />)}</div>
                        : searchResults.length === 0 ? <div className="p-5 text-center"><Package className="w-5 h-5 text-muted-foreground/20 mx-auto mb-1" /><p className="text-xs text-muted-foreground">{isRTL ? "لا توجد نتائج" : "No results"}</p></div>
                        : <div className="max-h-64 overflow-y-auto divide-y divide-border/10">
                            {searchResults.map(p => (
                              <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors">
                                <div className="w-8 h-8 rounded bg-muted/60 shrink-0 overflow-hidden flex items-center justify-center">
                                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain" /> : <Package className="w-3 h-3 text-muted-foreground/30" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-foreground truncate">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                                  <p className="text-[9px] text-muted-foreground font-mono">{p.sku}</p>
                                </div>
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-[9px] font-bold text-primary" onClick={() => handleAddToQuote(p)}><Plus className="w-2.5 h-2.5 mr-0.5" />{isRTL ? "تسعير" : "Quote"}</Button>
                              </div>
                            ))}
                            <button onClick={() => { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setShowResults(false); setSearchQuery(""); }}
                              className="w-full py-2 text-[11px] font-bold text-primary hover:bg-primary/5 transition-colors">{isRTL ? "عرض كل النتائج ←" : "View all →"}</button>
                          </div>}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ━━━ STATS ROW ━━━ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: BarChart3, label: isRTL ? "إجمالي الطلبات" : "Total Orders", value: stats.totalOrders, color: "text-primary", bg: "bg-primary/8" },
              { icon: Clock, label: isRTL ? "قيد الانتظار" : "Pending", value: stats.pendingOrders, color: "text-amber-600", bg: "bg-amber-50" },
              { icon: TrendingUp, label: isRTL ? "المشتريات" : "Total Spent", value: `${stats.totalSpent.toLocaleString()} ${isRTL ? "ج.م" : "EGP"}`, color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Bell, label: isRTL ? "إشعارات جديدة" : "Notifications", value: stats.unreadNotifs, color: "text-blue-600", bg: "bg-blue-50" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <div className="flex items-center gap-3 bg-background rounded-xl border border-border/40 p-3.5">
                  {loading ? <Skeleton className="h-10 w-full rounded" /> : <>
                    <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-black text-foreground leading-none">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  </>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━ MAIN CONTENT ━━━ */}
      <div className="container mx-auto px-4 py-6 space-y-6">

        {/* Quick Actions */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: ShoppingCart, label: isRTL ? "اطلب قطع غيار" : "Order Parts", desc: isRTL ? "بحث وطلب تسعير" : "Search & request quote", href: "/dealer?tab=quotes", primary: true },
              { icon: ClipboardList, label: isRTL ? "طلباتي" : "My Orders", desc: isRTL ? "متابعة حالة الطلبات" : "Track your orders", href: "/dealer?tab=orders" },
              { icon: FileText, label: isRTL ? "كشوفات الأسعار" : "Price Lists", desc: isRTL ? "عرض وتحميل الكشوفات" : "View & download", href: "/dealer?tab=price_lists" },
              { icon: CreditCard, label: isRTL ? "الدفع الإلكتروني" : "Payment", desc: isRTL ? "تحويل ودفع فوري" : "Instant transfer", href: "/dealer?tab=payment" },
            ].map((a, i) => (
              <motion.div key={a.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05, type: "spring", stiffness: 200, damping: 22 }}>
                <Link to={a.href} className="block h-full">
                  <div className={`h-full rounded-xl border p-4 md:p-5 transition-all duration-200 group cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${a.primary ? 'bg-primary border-primary text-primary-foreground hover:shadow-primary/20' : 'bg-card border-border/40 hover:border-primary/30 hover:shadow-primary/5'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${a.primary ? 'bg-white/15' : 'bg-primary/8'}`}>
                      <a.icon className={`w-5 h-5 ${a.primary ? 'text-white' : 'text-primary'}`} />
                    </div>
                    <p className={`text-sm font-bold mb-0.5 ${a.primary ? '' : 'text-foreground'}`}>{a.label}</p>
                    <p className={`text-[10px] leading-relaxed ${a.primary ? 'text-white/60' : 'text-muted-foreground'}`}>{a.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-12 gap-5">

          {/* ── Left: Orders ── */}
          <section className="lg:col-span-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">{isRTL ? "آخر الطلبات" : "Recent Orders"}</h2>
              <Link to="/dealer?tab=orders">
                <Button variant="ghost" size="sm" className="text-primary text-[10px] font-semibold h-6 px-2 gap-0.5 rounded-md hover:bg-primary/5">
                  {isRTL ? "عرض الكل" : "View all"}<ArrowIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : recentOrders.length === 0 ? (
              <Card className="border-border/40 rounded-xl">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/30" /></div>
                  <p className="text-xs text-muted-foreground mb-3">{isRTL ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                  <Link to="/dealer?tab=quotes"><Button size="sm" className="gap-1.5 text-[11px] h-8 rounded-lg"><ShoppingCart className="w-3.5 h-3.5" />{isRTL ? "اطلب الآن" : "Order Now"}</Button></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order, i) => {
                  const st = statusConfig[order.status] || statusConfig.pending;
                  return (
                    <motion.div key={order.id} initial={{ opacity: 0, x: isRTL ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                      <Card className="border-border/30 rounded-lg overflow-hidden hover:border-border/60 transition-colors">
                        <CardContent className="p-3.5 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-bold text-foreground">#{order.order_number}</p>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${st.bg} ${st.text}`}>{isRTL ? st.ar : st.en}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { day: "numeric", month: "short" })}</p>
                          </div>
                          <p className="text-sm font-black text-foreground whitespace-nowrap">
                            {order.total_amount.toLocaleString()} <span className="text-[9px] text-muted-foreground font-normal">{isRTL ? "ج.م" : "EGP"}</span>
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Right: Popular Products ── */}
          <section className="lg:col-span-7">
            {popularProducts.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    {isRTL ? "الأكثر طلباً" : "Most Popular"}
                  </h2>
                  <Badge variant="outline" className="text-[9px] font-medium border-border/40 text-muted-foreground px-2 py-0">{isRTL ? "متوفر" : "In stock"}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {popularProducts.slice(0, 4).map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                      <Card className="border-border/30 rounded-xl overflow-hidden group hover:border-primary/20 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-0">
                          <div className="aspect-[4/3] bg-muted/20 relative overflow-hidden flex items-center justify-center">
                            {p.image_url ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            : <Package className="w-8 h-8 text-muted-foreground/10" />}
                            {p.brand && <span className="absolute top-1.5 left-1.5 text-[7px] font-bold bg-foreground text-background px-1.5 py-0.5 rounded-sm">{brandLabels[p.brand] || p.brand}</span>}
                          </div>
                          <div className="p-2.5 border-t border-border/20">
                            <p className="text-[10px] font-semibold text-foreground line-clamp-1 mb-0.5">{p.name_ar}</p>
                            <p className="text-[8px] text-muted-foreground font-mono mb-2">{p.sku}</p>
                            <Button size="sm" variant="outline" className="w-full h-7 text-[9px] font-bold gap-1 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground transition-colors rounded-md" onClick={() => handleAddToQuote(p)}>
                              <Plus className="w-2.5 h-2.5" />{isRTL ? "طلب تسعير" : "Request Quote"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* ━━━ Offers ━━━ */}
        {offers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                {isRTL ? "عروض حصرية لك" : "Exclusive Offers"}
              </h2>
              <Link to="/products">
                <Button variant="ghost" size="sm" className="text-primary text-[10px] font-semibold h-6 px-2 gap-0.5 rounded-md hover:bg-primary/5">
                  {isRTL ? "الكل" : "All"}<ArrowIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {offers.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + i * 0.04 }}>
                  <Card className="border-border/30 rounded-xl overflow-hidden group hover:border-primary/20 hover:shadow-md transition-all">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted/20 relative overflow-hidden flex items-center justify-center">
                        {p.image_url ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        : <Package className="w-6 h-6 text-muted-foreground/10" />}
                      </div>
                      <div className="p-2 border-t border-border/20">
                        <p className="text-[9px] font-semibold text-foreground line-clamp-2 leading-relaxed mb-1">{p.name_ar}</p>
                        <p className="text-[7px] text-muted-foreground font-mono mb-1.5">{p.sku}</p>
                        <Button size="sm" className="w-full h-6 text-[8px] font-bold gap-0.5 rounded-md" onClick={() => handleAddToQuote(p)}>
                          <Plus className="w-2.5 h-2.5" />{isRTL ? "تسعير" : "Quote"}
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