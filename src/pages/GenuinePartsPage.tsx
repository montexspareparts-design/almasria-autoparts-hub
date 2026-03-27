import { useState, useMemo, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Clock, Cog, Truck, Package, CheckCircle2,
  ChevronLeft, Filter, MapPin, FileText, Users, Wrench,
  Lock, ShoppingCart, Eye, AlertTriangle, Grid3X3, List, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import AdvancedProductFilter, { ProductFilters } from "@/components/AdvancedProductFilter";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { lazy, Suspense } from "react";
import heroBg from "@/assets/parts-bg.jpg";

const Footer = lazy(() => import("@/components/Footer"));
const WhatsAppFloat = lazy(() => import("@/components/WhatsAppFloat"));
const BackToTop = lazy(() => import("@/components/BackToTop"));

/* ── Data ── */

const whyOem = [
  { icon: ShieldCheck, title: "موثوقية المصنع", desc: "مطابقة 100% لمعايير تويوتا اليابان." },
  { icon: Clock, title: "عمر افتراضي أطول", desc: "مواد مصنّعة وفق أعلى معايير التحمل والجودة." },
  { icon: Cog, title: "أداء وتوافق كامل", desc: "تركيب مثالي لكل موديل دون أي تعديل." },
  { icon: Package, title: "توريد رسمي معتمد", desc: "قنوات توريد مباشرة من الموزع المعتمد." },
];


const models = ["كوستر", "هاي إس", "هاي لوكس", "لاند كروزر", "كورولا / راش / بيلتا"];

const logistics = [
  { icon: Package, text: "استمرارية مخزون" },
  { icon: MapPin, text: "تغطية مصر بالكامل" },
  { icon: Users, text: "دعم للشركات والهيئات" },
  { icon: FileText, text: "فواتير منظمة وأنظمة ERP" },
];

const ITEMS_PER_PAGE = 24;

/* ── Page ── */

const GenuinePartsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDealer, user, dealerAccount } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProductFilters>({
    search: "", model: null, year: null, chassisNumber: "", partNumber: "", categoryId: null, brandKey: null, priceMin: "", priceMax: "", sortBy: "newest",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const DAILY_LIMIT = 20;

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const { data: viewedProductIds = [] } = useQuery({
    queryKey: ["dealer_views_today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("dealer_price_views").select("product_id").eq("user_id", user!.id).eq("view_date", today);
      if (error) throw error;
      return data.map((v) => v.product_id);
    },
    enabled: !!isDealer && !!user,
  });
  const dailyViewCount = viewedProductIds.length;
  const limitReached = dailyViewCount >= DAILY_LIMIT;

  const recordView = useCallback(async (productId: string) => {
    if (!user || !isDealer || viewedProductIds.includes(productId) || limitReached) return;
    await supabase.from("dealer_price_views").upsert(
      { user_id: user.id, product_id: productId, view_date: new Date().toISOString().split("T")[0] },
      { onConflict: "user_id,product_id,view_date" }
    );
    queryClient.invalidateQueries({ queryKey: ["dealer_views_today", user.id] });
  }, [user, isDealer, viewedProductIds, limitReached, queryClient]);

  const { data: tierPrices } = useQuery({
    queryKey: ["tier_prices_genuine", dealerAccount?.tier],
    queryFn: async () => {
      if (!dealerAccount) return {};
      const { data, error } = await supabase.from("product_tier_prices").select("product_id, price").eq("tier", dealerAccount.tier as any);
      if (error) throw error;
      const map: Record<string, number> = {};
      data.forEach((tp) => { map[tp.product_id] = tp.price; });
      return map;
    },
    enabled: !!dealerAccount,
  });

  const getProductPrice = (product: any) => {
    if (isDealer && tierPrices && tierPrices[product.id]) return tierPrices[product.id];
    return product.base_price;
  };

  const handleAddToCart = (product: any) => {
    const cartItem: CartItem = {
      id: product.id, name_ar: product.name_ar, sku: product.sku, image_url: product.image_url,
      unit_price: getProductPrice(product), quantity: product.min_order_qty || 1,
      stock_quantity: product.stock_quantity, min_order_qty: product.min_order_qty, brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  };

  const { data: dbCategories } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const categorySlug = searchParams.get("category");
    if (categorySlug && dbCategories) {
      const matched = dbCategories.find((c) => c.slug === categorySlug);
      if (matched) setFilters((prev) => ({ ...prev, categoryId: matched.id }));
    }
  }, [dbCategories, searchParams]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "toyota_genuine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("brand", "toyota_genuine" as any)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = products.filter((p) => {
      const s = filters.search?.toLowerCase() || "";
      const matchesSearch = !s || p.name_ar.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
      const matchesCategory = !filters.categoryId || p.category_id === filters.categoryId;
      const matchesModel = !filters.model || p.name_ar.includes(filters.model);
      const matchesYear = !filters.year || p.name_ar.includes(filters.year);
      const matchesPartNumber = !filters.partNumber || p.sku.toLowerCase().includes(filters.partNumber.toLowerCase());
      const matchesPriceMin = !filters.priceMin || p.base_price >= Number(filters.priceMin);
      const matchesPriceMax = !filters.priceMax || p.base_price <= Number(filters.priceMax);
      return matchesSearch && matchesCategory && matchesModel && matchesYear && matchesPartNumber && matchesPriceMin && matchesPriceMax;
    });
    switch (filters.sortBy) {
      case "price_asc": result.sort((a, b) => a.base_price - b.base_price); break;
      case "price_desc": result.sort((a, b) => b.base_price - a.base_price); break;
      case "name_asc": result.sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar")); break;
    }
    return result;
  }, [products, filters]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Helmet>
        <title>قطع غيار تويوتا الأصلية في مصر | المصرية جروب (موزع معتمد)</title>
        <meta
          name="description"
          content="المصرية جروب موزع معتمد لقطع غيار تويوتا الأصلية في مصر. توريد عبر قنوات رسمية، تغطية وطنية، وتسليم خلال 48 ساعة عبر شبكة توزيع منظمة."
        />
        <link rel="canonical" href="https://almasriaautoparts.com/products/genuine-toyota-parts" />
      </Helmet>

      <Navbar />

      {/* ═══ 1. Hero ═══ */}
      <section
        className="relative min-h-[55vh] flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div className="relative z-10 container mx-auto px-6 py-24 text-center max-w-[760px]">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-[1.4] mb-5">
            قطع غيار تويوتا الأصلية
          </h1>
          <p className="text-white/85 text-sm sm:text-base md:text-lg leading-[1.75] mb-8 max-w-[660px] mx-auto">
            نوفّر قطع غيار تويوتا الأصلية عبر قنوات توريد رسمية ووفق معايير المصنع (OEM)، مع تغطية وطنية وتسليم خلال 48&nbsp;ساعة.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="font-bold gap-2" asChild>
              <Link to="/contact#quote">اطلب عرض سعر</Link>
            </Button>
            <Button size="lg" variant="outline" className="font-bold gap-2 border-white/20 text-white bg-white/5 hover:bg-white/10" asChild>
              <a href="#genuine-products">
                تصفح المنتجات
                <ChevronLeft className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 2. لماذا القطع الأصلية؟ ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-4">
            لماذا تختار قطع تويوتا <span className="text-primary">الأصلية؟</span>
          </h2>
          <p className="text-muted-foreground text-center max-w-[720px] mx-auto mb-12 leading-[1.7]">
            باعتبار المصرية جروب موزعًا معتمدًا لقطع الغيار الأصلية، نضمن حصولك على منتجات موثوقة مطابقة لمعايير تويوتا.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyOem.map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
                </div>
                <p className="font-bold text-foreground mb-1">{item.title}</p>
                <p className="text-muted-foreground text-sm leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. تصفح المنتجات ═══ */}
      <section id="genuine-products" className="py-12 md:py-16 bg-background border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              تصفح قطع غيار تويوتا <span className="text-primary">الأصلية</span>
            </h2>
            <div className="h-1 w-16 bg-primary mx-auto rounded-full" />
          </div>

          {/* Dealer banners */}
          {!isDealer && (
            <div className="bg-muted/50 border border-primary/15 rounded-xl p-3.5 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                <p className="text-foreground text-sm"><strong>تاجر معتمد؟</strong> سجل دخولك للحصول على أسعار الجملة الخاصة.</p>
              </div>
              <Button size="sm" className="shrink-0 rounded-lg" asChild><Link to="/dealer-login">التسجيل كتاجر</Link></Button>
            </div>
          )}

          {isDealer && (
            <div className={`rounded-xl p-3.5 mb-4 flex items-center justify-between flex-wrap gap-3 border ${limitReached ? "bg-destructive/5 border-destructive/20" : "bg-muted/50 border-primary/15"}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${limitReached ? "bg-destructive/10" : "bg-primary/10"}`}>
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground text-sm">
                  {limitReached ? <><strong>استنفدت الحد اليومي.</strong> يمكنك مشاهدة أسعار جديدة غداً.</> : <>شاهدت <strong>{dailyViewCount}</strong> من <strong>{DAILY_LIMIT}</strong> صنف اليوم</>}
                </p>
              </div>
            </div>
          )}

          <AdvancedProductFilter
            filters={filters}
            onFiltersChange={setFilters}
            categories={dbCategories?.filter(cat => products?.some(p => p.category_id === cat.id))}
            categoryCounts={products?.reduce((acc, p) => { if (p.category_id) acc[p.category_id] = (acc[p.category_id] || 0) + 1; return acc; }, {} as Record<string, number>)}
            showCategories={true}
            totalResults={filteredProducts.length}
            isLoading={isLoading}
          />

          {/* View mode toggle */}
          <div className="flex items-center justify-between mb-5 mt-6">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            {totalPages > 1 && <p className="text-xs text-muted-foreground">صفحة {currentPage} من {totalPages}</p>}
          </div>

          {isLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                <Package className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground text-sm mb-4">جرب تغيير كلمة البحث أو الفلتر</p>
              <Button variant="outline" size="sm" onClick={() => setFilters({ search: "", model: null, year: null, chassisNumber: "", partNumber: "", categoryId: null, brandKey: null, priceMin: "", priceMax: "", sortBy: "newest" })}>
                مسح جميع الفلاتر
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-square bg-white relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-muted-foreground/20" /></div>
                    )}
                    {product.is_on_sale && <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">تخفيض</span>}
                  </div>
                  <div className="p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-[11px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{product.sku}</span>
                      {product.stock_quantity > 0 ? (
                        <span className="text-[10px] sm:text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">متوفر</span>
                      ) : (
                        <span className="text-[10px] sm:text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-semibold">غير متوفر</span>
                      )}
                    </div>
                    <h3 className="font-bold text-card-foreground text-xs sm:text-sm leading-relaxed mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">{product.name_ar}</h3>
                    {product.product_categories && <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">{(product.product_categories as any).name_ar}</p>}
                    {!user ? (
                      <Button variant="outline" size="sm" className="w-full mt-1 gap-2 text-xs" onClick={() => { toast({ title: "يجب تسجيل الدخول أولاً", description: "سجل دخولك لتتمكن من عرض أسعار المنتجات" }); navigate("/auth"); }}>
                        <Lock className="w-3.5 h-3.5" />سجل دخولك لعرض السعر
                      </Button>
                    ) : !isDealer ? (
                      <>
                        <div className="text-primary font-black text-base sm:text-lg">{product.base_price.toLocaleString("ar-EG")} ج.م</div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground">سعر قطاعي</p>
                      </>
                    ) : viewedProductIds.includes(product.id) ? (
                      <>
                        <div className="text-primary font-black text-base sm:text-lg">{getProductPrice(product).toLocaleString("ar-EG")} ج.م</div>
                        <p className="text-[10px] sm:text-[11px] text-green-600 font-semibold">سعر الجملة الخاص بك</p>
                      </>
                    ) : !limitReached ? (
                      <Button variant="outline" size="sm" className="w-full mt-1 gap-2 text-xs" onClick={() => recordView(product.id)}>
                        <Eye className="w-3.5 h-3.5" />اعرض السعر ({DAILY_LIMIT - dailyViewCount} متبقي)
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs py-1"><Lock className="w-3.5 h-3.5" /><span>استنفدت الحد اليومي</span></div>
                    )}
                    {product.min_order_qty > 1 && <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-2">الحد الأدنى: {product.min_order_qty} قطعة</p>}
                    {product.stock_quantity > 0 && user && (!isDealer || viewedProductIds.includes(product.id)) && (
                      <Button size="sm" className="w-full mt-3 gap-2 text-xs" onClick={() => handleAddToCart(product)}>
                        <ShoppingCart className="w-3.5 h-3.5" />أضف للسلة
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="w-28 sm:w-36 shrink-0 bg-white flex items-center justify-center p-3">
                    {product.image_url ? <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain" loading="lazy" /> : <Package className="w-10 h-10 text-muted-foreground/20" />}
                  </div>
                  <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{product.sku}</span>
                      {product.stock_quantity > 0 ? <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">متوفر</span> : <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-semibold">غير متوفر</span>}
                    </div>
                    <h3 className="font-bold text-card-foreground text-sm leading-relaxed mb-1">{product.name_ar}</h3>
                    {product.product_categories && <p className="text-xs text-muted-foreground mb-2">{(product.product_categories as any).name_ar}</p>}
                    <div className="flex items-center gap-3 flex-wrap">
                      {!user ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => navigate("/auth")}><Lock className="w-3 h-3" />سجل لعرض السعر</Button>
                      ) : !isDealer ? (
                        <span className="text-primary font-black text-lg">{product.base_price.toLocaleString("ar-EG")} ج.م</span>
                      ) : viewedProductIds.includes(product.id) ? (
                        <span className="text-primary font-black text-lg">{getProductPrice(product).toLocaleString("ar-EG")} ج.م</span>
                      ) : !limitReached ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => recordView(product.id)}><Eye className="w-3 h-3" />اعرض السعر</Button>
                      ) : null}
                      {product.stock_quantity > 0 && user && (!isDealer || viewedProductIds.includes(product.id)) && (
                        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => handleAddToCart(product)}><ShoppingCart className="w-3 h-3" />أضف للسلة</Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="gap-1">
                <ChevronRight className="w-4 h-4" />السابق
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) page = i + 1;
                  else if (currentPage <= 4) page = i + 1;
                  else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                  else page = currentPage - 3 + i;
                  return (
                    <button key={page} onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${currentPage === page ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      {page}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => { setCurrentPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="gap-1">
                التالي<ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
        price={selectedProduct ? !user ? null : !isDealer ? selectedProduct.base_price : viewedProductIds.includes(selectedProduct.id) ? getProductPrice(selectedProduct) : null : null}
        priceLabel={selectedProduct && user ? isDealer && viewedProductIds.includes(selectedProduct.id) ? "سعر الجملة الخاص بك" : !isDealer ? "سعر قطاعي" : undefined : undefined}
        canAddToCart={!!user && (!isDealer || (selectedProduct && viewedProductIds.includes(selectedProduct.id)))}
        onAddToCart={handleAddToCart}
        isLoggedIn={!!user}
        isDealer={isDealer}
        onLoginPrompt={() => { toast({ title: "يجب تسجيل الدخول أولاً" }); navigate("/auth"); }}
        onRevealPrice={(productId) => recordView(productId)}
        remainingViews={DAILY_LIMIT - dailyViewCount}
        limitReached={limitReached}
      />

      {/* ═══ 4. التوافق والموديلات ═══ */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-10">
            ملائمة لأشهر موديلات <span className="text-primary">تويوتا</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {models.map((m) => (
              <span key={m} className="px-5 py-2.5 bg-card border border-border rounded-full text-sm font-bold text-foreground">{m}</span>
            ))}
          </div>
          <p className="text-muted-foreground text-center text-sm">
            نوفر دعمًا لموديلات إضافية حسب الطلب — <Link to="/contact" className="text-primary font-bold hover:underline">تواصل معنا</Link>.
          </p>
        </div>
      </section>

      {/* ═══ 5. اللوجستيات والتوزيع ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-4">
            توريد سريع و<span className="text-primary">تغطية وطنية</span>
          </h2>
          <p className="text-muted-foreground text-center max-w-[720px] mx-auto mb-10 leading-[1.7]">
            نعتمد على مخازن مركزية وشبكة لوجستية منظمة تتيح تسليم الطلبات خلال 48&nbsp;ساعة على مستوى الجمهورية.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {logistics.map((l) => (
              <div key={l.text} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <l.icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-bold text-foreground">{l.text}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button className="font-bold gap-2" asChild>
              <Link to="/contact">تواصل مع فريق المبيعات<ChevronLeft className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 6. MTX Upsell ═══ */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            بدائل عالية الجودة عبر <span className="text-primary">MTX</span>
          </h2>
          <p className="text-muted-foreground max-w-[720px] mx-auto mb-8 leading-[1.7]">
            نوفر أيضًا منتجات <Link to="/mtx" className="text-primary font-bold hover:underline">MTX</Link> بجودة تضاهي المواصفات الأصلية كخيار تكميلي لجميع فئات العملاء.
          </p>
          <Button variant="outline" className="font-bold gap-2" asChild>
            <Link to="/mtx">تعرف على MTX<ChevronLeft className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      {/* ═══ 7. CTA ختامي ═══ */}
      <section className="py-20 md:py-28 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-black mb-6">
            اطلب قطع الغيار <span className="text-primary">الأصلية</span> الآن
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button size="lg" className="w-full sm:w-auto font-bold" asChild>
              <Link to="/contact#quote">اطلب عرض سعر</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
              <Link to="/contact">تواصل معنا</Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/about" className="text-secondary-foreground/60 hover:text-primary transition-colors">من نحن</Link>
            <Link to="/mtx" className="text-secondary-foreground/60 hover:text-primary transition-colors">MTX</Link>
            <Link to="/what-sets-us-apart" className="text-secondary-foreground/60 hover:text-primary transition-colors">ما يميزنا</Link>
          </div>
        </div>
      </section>

      <Suspense fallback={null}><Footer /></Suspense>
      <Suspense fallback={null}><WhatsAppFloat /></Suspense>
      <Suspense fallback={null}><BackToTop /></Suspense>
    </div>
  );
};

export default GenuinePartsPage;
