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
  CreditCard,
  Receipt,
  Zap,
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

const statusMap: Record<string, { label_ar: string; label_en: string; dot: string }> = {
  pending: { label_ar: "قيد الانتظار", label_en: "Pending", dot: "bg-amber-400" },
  confirmed: { label_ar: "تمت الموافقة", label_en: "Confirmed", dot: "bg-blue-400" },
  processing: { label_ar: "جاري التجهيز", label_en: "Processing", dot: "bg-primary" },
  shipped: { label_ar: "تم الشحن", label_en: "Shipped", dot: "bg-purple-400" },
  delivered: { label_ar: "تم التسليم", label_en: "Delivered", dot: "bg-emerald-400" },
  cancelled: { label_ar: "ملغى", label_en: "Cancelled", dot: "bg-destructive" },
};

const brandLabels: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX",
  denso: "DENSO",
  aisin: "AISIN",
};

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

  // ── Search ──
  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    setSearching(true); setShowResults(true);
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

  useEffect(() => { const t = setTimeout(() => handleSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery, handleSearch]);

  // ── Data Fetching ──
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [ordersRes, notifsRes, offersRes, popularRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, status, total_amount, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url").eq("is_active", true).eq("is_on_sale", true).limit(6),
        supabase.from("products").select("id, name_ar, name_en, sku, base_price, sale_price, image_url, brand, stock_quantity").eq("is_active", true).gt("stock_quantity", 20).order("stock_quantity", { ascending: false }).limit(8),
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
      setPopularProducts(
        ((popularRes.data as any[]) || []).sort(() => Math.random() - 0.5)
          .map((p) => ({ id: p.id, name_ar: p.name_ar, name_en: p.name_en, sku: p.sku, base_price: p.base_price, sale_price: p.sale_price, image_url: p.image_url, brand: p.brand }))
      );
      setLoading(false);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchTotalStats = async () => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      const { data: allOrders } = await supabase.from("orders").select("total_amount").eq("user_id", user.id);
      setStats((prev) => ({ ...prev, totalOrders: count || 0, totalSpent: allOrders?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0 }));
    };
    fetchTotalStats();
  }, [user]);

  const tierLabel = dealerAccount?.tier === "wholesale_tier1" ? (isRTL ? "جملة — درجة أولى" : "Wholesale Tier 1")
    : dealerAccount?.tier === "wholesale_tier2" ? (isRTL ? "جملة — درجة ثانية" : "Wholesale Tier 2")
    : dealerAccount?.tier === "corporate" ? (isRTL ? "شركات" : "Corporate")
    : (isRTL ? "تجزئة" : "Retail");

  const handleAddToQuote = useCallback((product: OfferProduct) => {
    const existing = JSON.parse(sessionStorage.getItem("quote_pending_items") || "[]");
    if (!existing.find((p: any) => p.id === product.id)) {
      existing.push({ id: product.id, sku: product.sku, name_ar: product.name_ar, name_en: product.name_en });
      sessionStorage.setItem("quote_pending_items", JSON.stringify(existing));
    }
    toast({
      title: isRTL ? "✅ تمت الإضافة لعرض السعر" : "✅ Added to Quote",
      description: isRTL ? `${product.name_ar} — اذهب لعرض السعر لمعرفة التسعير` : `${product.name_en || product.name_ar} — Go to Quote Builder`,
    });
  }, [isRTL, toast]);

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-muted/30" dir={isRTL ? "rtl" : "ltr"}>

      {/* ─── Hero Welcome ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/8 via-transparent to-transparent" />
        <div className="container mx-auto px-4 pt-8 pb-5 md:pt-10 md:pb-6 relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                {isRTL ? "مرحباً بك" : "Welcome back"}
              </h1>
              <span className="text-2xl">👋</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <Badge className="text-[10px] font-bold bg-primary/10 text-primary border-0 px-2 py-0.5 rounded-md">
                {tierLabel}
              </Badge>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="relative max-w-lg">
            <div className="relative bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
              <div className="relative flex items-center">
                <Search className={`absolute w-4 h-4 text-muted-foreground/40 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                  placeholder={isRTL ? "ابحث برقم القطعة أو اسم المنتج..." : "Search by part number or name..."}
                  className={`h-11 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 ${isRTL ? 'pr-10 pl-9' : 'pl-10 pr-9'}`}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className={`absolute p-1 rounded-full hover:bg-muted transition-colors ${isRTL ? 'left-2.5' : 'right-2.5'}`}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            <AnimatePresence>
              {showResults && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="absolute z-50 w-full mt-1.5">
                  <Card className="border-border/50 shadow-2xl overflow-hidden rounded-xl">
                    <CardContent className="p-0">
                      {searching ? (
                        <div className="p-3 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-6 text-center">
                          <Package className="w-6 h-6 text-muted-foreground/20 mx-auto mb-1.5" />
                          <p className="text-muted-foreground text-xs">{isRTL ? "لا توجد نتائج" : "No results"}</p>
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y divide-border/15">
                          {searchResults.map((p) => (
                            <div key={p.id} className="flex items-center gap-2.5 p-2.5 hover:bg-muted/40 transition-colors">
                              <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 overflow-hidden">
                                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain" /> : <Package className="w-3.5 h-3.5 text-muted-foreground/30" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-foreground truncate">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                              </div>
                              <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-[10px] font-bold h-7 px-2 text-primary hover:bg-primary/10" onClick={() => handleAddToQuote(p)}>
                                <Plus className="w-3 h-3" />{isRTL ? "تسعير" : "Quote"}
                              </Button>
                            </div>
                          ))}
                          <button onClick={() => { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setShowResults(false); setSearchQuery(""); }} className="w-full p-2.5 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors">
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

      <div className="container mx-auto px-4 pb-8 space-y-5">

        {/* ─── Quick Actions — 2×2 Grid ─── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { icon: ShoppingCart, label: isRTL ? "اطلب قطع غيار" : "Order Parts", sub: isRTL ? "بحث وتسعير" : "Search & Quote", href: "/dealer?tab=quotes", accent: true },
            { icon: ClipboardList, label: isRTL ? "طلباتي" : "My Orders", sub: `${stats.pendingOrders} ${isRTL ? "معلقة" : "pending"}`, href: "/dealer?tab=orders" },
            { icon: FileText, label: isRTL ? "كشوفات الأسعار" : "Price Lists", sub: isRTL ? "تحميل PDF" : "Download PDF", href: "/dealer?tab=price_lists" },
            { icon: CreditCard, label: isRTL ? "الدفع الإلكتروني" : "Payment", sub: isRTL ? "تحويل فوري" : "Instant transfer", href: "/dealer?tab=payment" },
          ].map((action, i) => (
            <motion.div key={action.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05, type: "spring", stiffness: 260, damping: 24 }}>
              <Link to={action.href}>
                <Card className={`border-border/30 rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${action.accent ? 'bg-primary text-primary-foreground border-primary/20' : 'hover:border-primary/20'}`}>
                  <CardContent className="p-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${action.accent ? 'bg-white/15' : 'bg-primary/8'}`}>
                      <action.icon className={`w-4.5 h-4.5 ${action.accent ? 'text-white' : 'text-primary'}`} />
                    </div>
                    <p className={`text-sm font-bold leading-tight mb-0.5 ${action.accent ? '' : 'text-foreground'}`}>{action.label}</p>
                    <p className={`text-[10px] ${action.accent ? 'text-white/60' : 'text-muted-foreground'}`}>{action.sub}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </section>

        {/* ─── Stats Strip ─── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/30 rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-4 divide-x divide-border/20 rtl:divide-x-reverse">
                {[
                  { icon: Package, label: isRTL ? "الطلبات" : "Orders", value: stats.totalOrders, iconColor: "text-primary" },
                  { icon: Clock, label: isRTL ? "معلقة" : "Pending", value: stats.pendingOrders, iconColor: "text-amber-500" },
                  { icon: TrendingUp, label: isRTL ? "المشتريات" : "Spent", value: `${(stats.totalSpent / 1000).toFixed(1)}K`, iconColor: "text-emerald-500" },
                  { icon: Bell, label: isRTL ? "إشعارات" : "Alerts", value: stats.unreadNotifs, iconColor: "text-blue-500" },
                ].map((s, i) => (
                  <div key={i} className="p-3 md:p-4 text-center">
                    {loading ? <Skeleton className="h-10 w-full rounded" /> : (
                      <>
                        <s.icon className={`w-4 h-4 mx-auto mb-1.5 ${s.iconColor}`} />
                        <p className="text-lg md:text-xl font-black text-foreground leading-none">{s.value}</p>
                        <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">{s.label}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* ─── Two Column: Orders + Popular ─── */}
        <div className="grid lg:grid-cols-5 gap-5">
          
          {/* Recent Orders */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-foreground">{isRTL ? "آخر الطلبات" : "Recent Orders"}</h2>
              <Link to="/dealer?tab=orders">
                <Button variant="ghost" size="sm" className="text-primary text-[10px] font-bold gap-0.5 h-6 px-1.5 rounded-md">
                  {isRTL ? "الكل" : "All"}<ArrowIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : recentOrders.length === 0 ? (
              <Card className="border-border/30 rounded-xl">
                <CardContent className="p-6 text-center">
                  <Package className="w-8 h-8 text-muted-foreground/15 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">{isRTL ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                  <Link to="/dealer?tab=quotes">
                    <Button size="sm" className="gap-1.5 rounded-lg text-[11px] h-8">
                      <Zap className="w-3.5 h-3.5" />{isRTL ? "اطلب الآن" : "Order Now"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/30 rounded-xl overflow-hidden">
                <CardContent className="p-0">
                  {recentOrders.map((order, i) => {
                    const st = statusMap[order.status] || statusMap.pending;
                    return (
                      <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.04 }}
                        className={`flex items-center gap-3 px-3.5 py-3 hover:bg-muted/30 transition-colors ${i > 0 ? 'border-t border-border/15' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-foreground">#{order.order_number}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}</p>
                        </div>
                        <span className="text-[10px] font-black text-foreground whitespace-nowrap">
                          {order.total_amount.toLocaleString()} <span className="text-muted-foreground font-normal text-[8px]">{isRTL ? "ج.م" : "EGP"}</span>
                        </span>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Most Popular */}
          {popularProducts.length > 0 && (
            <section className="lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  {isRTL ? "الأكثر طلباً" : "Most Popular"}
                </h2>
                <span className="text-[9px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{isRTL ? "متوفر للطلب الفوري" : "In stock"}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {popularProducts.slice(0, 4).map((product, i) => (
                  <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.04 }}>
                    <Card className="border-border/30 hover:border-primary/20 transition-all duration-200 hover:shadow-md group overflow-hidden rounded-xl">
                      <CardContent className="p-0">
                        <div className="aspect-square bg-white relative overflow-hidden">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/15" /></div>
                          )}
                          {product.brand && (
                            <span className="absolute top-1.5 right-1.5 text-[7px] font-bold bg-foreground/80 text-background px-1.5 py-0.5 rounded">
                              {brandLabels[product.brand] || product.brand}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-[10px] font-bold text-foreground line-clamp-2 leading-relaxed mb-1">{product.name_ar}</p>
                          <p className="text-[8px] text-muted-foreground mb-2 font-mono">{product.sku}</p>
                          <Button size="sm" variant="outline" className="w-full gap-1 text-[9px] font-bold h-6 rounded-md text-primary border-primary/20 hover:bg-primary/5" onClick={() => handleAddToQuote(product)}>
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
        </div>

        {/* ─── Offers (full width) ─── */}
        {offers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                {isRTL ? "عروض حصرية" : "Exclusive Offers"}
              </h2>
              <Link to="/products">
                <Button variant="ghost" size="sm" className="text-primary text-[10px] font-bold gap-0.5 h-6 px-1.5 rounded-md">
                  {isRTL ? "الكل" : "All"}<ArrowIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {offers.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
                  <Card className="border-border/30 hover:border-primary/20 transition-all duration-200 hover:shadow-md group overflow-hidden rounded-xl">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-white relative overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/20"><Package className="w-5 h-5 text-muted-foreground/15" /></div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[10px] font-bold text-foreground line-clamp-2 leading-relaxed mb-1">{product.name_ar}</p>
                        <p className="text-[8px] text-muted-foreground mb-2 font-mono">{product.sku}</p>
                        <Button size="sm" className="w-full gap-1 text-[9px] font-bold h-6 rounded-md" onClick={() => handleAddToQuote(product)}>
                          <Plus className="w-2.5 h-2.5" />{isRTL ? "أضف للتسعير" : "Add to Quote"}
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