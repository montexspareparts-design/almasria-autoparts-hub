import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, Package, ShoppingCart, Eye, AlertTriangle, Grid3X3, List, ChevronLeft, ChevronRight } from "lucide-react";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandHeroBanner from "@/components/BrandHeroBanner";
import AdvancedProductFilter, { ProductFilters } from "@/components/AdvancedProductFilter";
import RelatedProducts from "@/components/RelatedProducts";
import MaintenanceBundles from "@/components/MaintenanceBundles";
import SpecialOffers from "@/components/SpecialOffers";
import brandGenuineParts from "@/assets/brand-genuine-parts.png";
import brandToyotaOil from "@/assets/brand-toyota-oil.png";
import brandMtx from "@/assets/brand-mtx.jpg";
import brandDenso from "@/assets/brand-denso.png";
import brandAisin from "@/assets/brand-aisin.png";
import oilBg from "@/assets/oil-bg.jpg";

const brandConfig: Record<string, { title: string; subtitle: string; description: string; badge: string; brandKey: string; logo: string; backgroundImage?: string }> = {
  "toyota-genuine": {
    title: "قطع غيار تويوتا الأصلية",
    subtitle: "Toyota Genuine Parts",
    description: "قطع غيار أصلية 100% من تويوتا اليابان. نحن موزع معتمد رسمي لجميع أنواع قطع غيار تويوتا الأصلية في مصر.",
    badge: "موزع معتمد رسمي",
    brandKey: "toyota_genuine",
    logo: brandGenuineParts,
  },
  "toyota-oils": {
    title: "زيوت تويوتا الأصلية",
    subtitle: "Toyota Genuine Motor Oil",
    description: "زيوت تويوتا الأصلية بجميع درجات اللزوجة. زيوت المحرك، زيوت الفتيس، سوائل الفرامل، وجميع سوائل تويوتا الأصلية.",
    badge: "موزع معتمد رسمي",
    brandKey: "toyota_oils",
    logo: brandToyotaOil,
  },
  "mtx-aftermarket": {
    title: "MTX Aftermarket",
    subtitle: "قطع غيار مستوردة بأعلى جودة",
    description: "MTX هي علامتنا التجارية المسجلة لقطع الغيار المستوردة عالية الجودة بأفضل الأسعار.",
    badge: "علامة تجارية مسجلة",
    brandKey: "mtx_aftermarket",
    logo: brandMtx,
  },
  "denso": {
    title: "DENSO",
    subtitle: "قطع غيار دينسو اليابانية",
    description: "قطع غيار دينسو الأصلية - الشركة اليابانية الرائدة في تصنيع مكونات السيارات عالية الجودة.",
    badge: "وكيل معتمد",
    brandKey: "denso",
    logo: brandDenso,
  },
  "aisin": {
    title: "AISIN",
    subtitle: "قطع غيار أيسن اليابانية",
    description: "قطع غيار أيسن الأصلية - من أكبر مصنعي قطع غيار السيارات في العالم، جودة يابانية معتمدة.",
    badge: "وكيل معتمد",
    brandKey: "aisin",
    logo: brandAisin,
  },
};

const allBrands = [
  { label: "قطع غيار تويوتا الأصلية", labelEn: "Toyota Genuine Parts", image: brandGenuineParts, to: "/products/toyota-genuine", scale: "scale-100" },
  { label: "زيوت تويوتا الأصلية", labelEn: "Toyota Genuine Lubricants", image: brandToyotaOil, to: "/products/toyota-oils", scale: "scale-150" },
  { label: "MTX أفترماركت", labelEn: "MTX Aftermarket", image: brandMtx, to: "/products/mtx-aftermarket", scale: "scale-150" },
  { label: "DENSO", labelEn: "DENSO", image: brandDenso, to: "/products/denso", scale: "scale-100" },
  { label: "AISIN", labelEn: "AISIN", image: brandAisin, to: "/products/aisin", scale: "scale-100" },
];

const ITEMS_PER_PAGE = 24;

const ProductsPage = () => {
  const { brand } = useParams<{ brand: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDealer, user, dealerAccount } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const config = brand ? brandConfig[brand] : null;
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    model: null,
    year: null,
    chassisNumber: "",
    partNumber: "",
    categoryId: null,
    priceMin: "",
    priceMax: "",
    sortBy: "newest",
  });
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const DAILY_LIMIT = 20;

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  const { data: viewedProductIds = [] } = useQuery({
    queryKey: ["dealer_views_today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("dealer_price_views")
        .select("product_id")
        .eq("user_id", user!.id)
        .eq("view_date", today);
      if (error) throw error;
      return data.map((v) => v.product_id);
    },
    enabled: !!isDealer && !!user,
  });

  const dailyViewCount = viewedProductIds.length;
  const limitReached = dailyViewCount >= DAILY_LIMIT;

  const recordView = useCallback(async (productId: string) => {
    if (!user || !isDealer) return;
    if (viewedProductIds.includes(productId)) return;
    if (limitReached) return;
    await supabase.from("dealer_price_views").upsert(
      { user_id: user.id, product_id: productId, view_date: new Date().toISOString().split("T")[0] },
      { onConflict: "user_id,product_id,view_date" }
    );
    queryClient.invalidateQueries({ queryKey: ["dealer_views_today", user.id] });
  }, [user, isDealer, viewedProductIds, limitReached, queryClient]);

  const canSeePrice = (productId: string) => {
    if (!user) return false;
    if (!isDealer) return true;
    return viewedProductIds.includes(productId) || !limitReached;
  };

  const { data: tierPrices } = useQuery({
    queryKey: ["tier_prices", dealerAccount?.tier, config?.brandKey],
    queryFn: async () => {
      if (!dealerAccount) return {};
      const { data, error } = await supabase
        .from("product_tier_prices")
        .select("product_id, price")
        .eq("tier", dealerAccount.tier as any);
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
      id: product.id,
      name_ar: product.name_ar,
      sku: product.sku,
      image_url: product.image_url,
      unit_price: getProductPrice(product),
      quantity: product.min_order_qty || 1,
      stock_quantity: product.stock_quantity,
      min_order_qty: product.min_order_qty,
      brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  };

  const { data: categories } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const categorySlug = searchParams.get("category");
    if (categorySlug && categories) {
      const matched = categories.find((c) => c.slug === categorySlug);
      if (matched) setFilters((prev) => ({ ...prev, categoryId: matched.id }));
    }
  }, [categories, searchParams]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", config?.brandKey],
    queryFn: async () => {
      if (!config) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("brand", config.brandKey as any)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!config,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = products.filter((p) => {
      const matchesSearch =
        !filters.search ||
        p.name_ar.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.sku.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = !filters.categoryId || p.category_id === filters.categoryId;
      const matchesModel = !filters.model || p.name_ar.includes(filters.model);
      const matchesYear = !filters.year || p.name_ar.includes(filters.year);
      const matchesPartNumber = !filters.partNumber || p.sku.toLowerCase().includes(filters.partNumber.toLowerCase());
      const price = p.base_price;
      const matchesPriceMin = !filters.priceMin || price >= Number(filters.priceMin);
      const matchesPriceMax = !filters.priceMax || price <= Number(filters.priceMax);
      return matchesSearch && matchesCategory && matchesModel && matchesYear && matchesPartNumber && matchesPriceMin && matchesPriceMax;
    });

    // Sort
    switch (filters.sortBy) {
      case "price_asc":
        result.sort((a, b) => a.base_price - b.base_price);
        break;
      case "price_desc":
        result.sort((a, b) => b.base_price - a.base_price);
        break;
      case "name_asc":
        result.sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar"));
        break;
      default: // newest
        break;
    }

    return result;
  }, [products, filters]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  if (!config) {
    return (
      <div className="min-h-screen bg-dark-section">
        <Navbar />
        
        {/* Full-page brands showcase */}
        <section className="min-h-screen pt-24 pb-20 relative overflow-hidden flex flex-col">
          {/* Background effects */}
          <div className="absolute inset-0">
            <motion.div className="absolute top-20 right-[5%] w-[600px] h-[600px] rounded-full bg-primary/[0.05] blur-[180px]" animate={{ scale: [1, 1.3, 1], x: [0, 40, 0] }} transition={{ duration: 10, repeat: Infinity }} />
            <motion.div className="absolute bottom-20 left-[5%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--gold-accent))]/[0.04] blur-[140px]" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 12, repeat: Infinity }} />
          </div>

          <div className="container mx-auto px-4 relative z-10 flex-1 flex flex-col justify-center">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center mb-16"
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/12 border border-primary/20 text-primary text-sm font-bold mb-6 backdrop-blur-sm"
              >
                <Package className="w-4 h-4" />
                5 علامات تجارية معتمدة
              </motion.span>
              <h1 className="text-5xl md:text-7xl font-black text-[hsl(var(--section-dark-foreground))] mb-5 tracking-tight leading-[1.1]">
                اكتشف <span className="shimmer-text">منتجاتنا</span>
              </h1>
              <p className="text-[hsl(var(--section-dark-foreground))]/50 text-lg max-w-xl mx-auto leading-relaxed">
                اختر العلامة التجارية وتصفح جميع المنتجات المتاحة
              </p>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "6rem" }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-1 bg-gradient-to-l from-primary to-[hsl(var(--gold-accent))] mx-auto rounded-full mt-6"
              />
            </motion.div>

            {/* Premium Brands Grid - Top row 3, bottom row 2 centered */}
            <div className="max-w-5xl mx-auto w-full">
              {/* Top row - 3 brands */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                {allBrands.slice(0, 3).map((b, i) => (
                  <motion.div
                    key={b.to}
                    initial={{ opacity: 0, y: 50, rotateX: -10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 70 }}
                  >
                    <Link
                      to={b.to}
                      className="group block relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-3"
                    >
                      {/* Card with glass effect */}
                      <div className="bg-[hsl(var(--section-dark-foreground))]/[0.06] backdrop-blur-md border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/40 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20">
                        {/* Top accent line */}
                        <motion.div
                          className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--gold-accent))] to-primary"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.6 + i * 0.15, duration: 0.8 }}
                        />
                        
                        {/* Logo area */}
                        <div className="bg-white/95 mx-4 mt-4 rounded-xl p-6 flex items-center justify-center aspect-[3/2] relative overflow-hidden group-hover:shadow-lg transition-shadow duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/8 transition-all duration-500" />
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                          />
                          <motion.img
                            src={b.image}
                            alt={b.label}
                            className={`relative z-10 max-h-20 w-auto object-contain ${b.scale}`}
                            whileHover={{ scale: 1.08 }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>

                        {/* Info */}
                        <div className="p-5 text-center">
                          <h3 className="font-bold text-[hsl(var(--section-dark-foreground))] text-base mb-1">{b.label}</h3>
                          <p className="text-xs text-[hsl(var(--section-dark-foreground))]/40 mb-3">{b.labelEn}</p>
                          <span className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                            تصفح المنتجات
                            <ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Bottom row - 2 brands centered */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {allBrands.slice(3).map((b, i) => (
                  <motion.div
                    key={b.to}
                    initial={{ opacity: 0, y: 50, rotateX: -10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: 0.65 + i * 0.12, type: "spring", stiffness: 70 }}
                  >
                    <Link
                      to={b.to}
                      className="group block relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-3"
                    >
                      <div className="bg-[hsl(var(--section-dark-foreground))]/[0.06] backdrop-blur-md border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/40 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20">
                        <motion.div
                          className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--gold-accent))] to-primary"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.8 + i * 0.15, duration: 0.8 }}
                        />
                        <div className="bg-white/95 mx-4 mt-4 rounded-xl p-6 flex items-center justify-center aspect-[3/2] relative overflow-hidden group-hover:shadow-lg transition-shadow duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/8 transition-all duration-500" />
                          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          <motion.img
                            src={b.image}
                            alt={b.label}
                            className={`relative z-10 max-h-20 w-auto object-contain ${b.scale}`}
                            whileHover={{ scale: 1.08 }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="p-5 text-center">
                          <h3 className="font-bold text-[hsl(var(--section-dark-foreground))] text-base mb-1">{b.label}</h3>
                          <p className="text-xs text-[hsl(var(--section-dark-foreground))]/40 mb-3">{b.labelEn}</p>
                          <span className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                            تصفح المنتجات
                            <ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandHeroBanner
        logo={config.logo}
        title={config.title}
        subtitle={config.subtitle}
        description={config.description}
        badge={config.badge}
      />

      {/* Sticky filter bar */}
      <section className="py-5 bg-background/95 backdrop-blur-sm border-b border-border sticky top-14 md:top-20 z-30">
        <div className="container mx-auto px-4">
          {/* Dealer promo / limit banners */}
          {!isDealer && (
            <div className="bg-muted/50 border border-primary/15 rounded-xl p-3.5 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground text-sm">
                  <strong>تاجر معتمد؟</strong> سجل دخولك للحصول على أسعار الجملة الخاصة.
                </p>
              </div>
              <Button size="sm" className="shrink-0 rounded-lg" asChild>
                <Link to="/dealer-login">دخول التجار</Link>
              </Button>
            </div>
          )}

          {isDealer && (
            <div className={`rounded-xl p-3.5 mb-4 flex items-center justify-between flex-wrap gap-3 border ${
              limitReached ? "bg-destructive/5 border-destructive/20" : "bg-muted/50 border-primary/15"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${limitReached ? "bg-destructive/10" : "bg-primary/10"}`}>
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground text-sm">
                  {limitReached ? (
                    <><strong>استنفدت الحد اليومي.</strong> يمكنك مشاهدة أسعار جديدة غداً.</>
                  ) : (
                    <>شاهدت <strong>{dailyViewCount}</strong> من <strong>{DAILY_LIMIT}</strong> صنف اليوم</>
                  )}
                </p>
              </div>
              {limitReached && (
                <div className="flex items-center gap-1 text-destructive text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>الحد الأقصى</span>
                </div>
              )}
            </div>
          )}

          <AdvancedProductFilter
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            showCategories={config.brandKey !== "toyota_oils"}
            totalResults={filteredProducts.length}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* View mode toggle + products grid */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* View mode toggle */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            {totalPages > 1 && (
              <p className="text-xs text-muted-foreground">
                صفحة {currentPage} من {totalPages}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className={viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-3"
            }>
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
              <Button variant="outline" size="sm" onClick={() => setFilters({
                search: "", model: null, year: null, chassisNumber: "", partNumber: "", categoryId: null, priceMin: "", priceMax: "", sortBy: "newest"
              })}>
                مسح جميع الفلاتر
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            /* ===== GRID VIEW ===== */
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-square bg-white relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name_ar}
                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}
                    {product.is_on_sale && (
                      <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">تخفيض</span>
                    )}
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

                    <h3 className="font-bold text-card-foreground text-xs sm:text-sm leading-relaxed mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name_ar}
                    </h3>

                    {product.product_categories && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
                        {(product.product_categories as any).name_ar}
                      </p>
                    )}

                    {/* Price section */}
                    {!user ? (
                      <Button variant="outline" size="sm" className="w-full mt-1 gap-2 text-xs" onClick={() => { toast({ title: "يجب تسجيل الدخول أولاً", description: "سجل دخولك لتتمكن من عرض أسعار المنتجات" }); navigate("/auth"); }}>
                        <Lock className="w-3.5 h-3.5" />
                        سجل دخولك لعرض السعر
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
                        <Eye className="w-3.5 h-3.5" />
                        اعرض السعر ({DAILY_LIMIT - dailyViewCount} متبقي)
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>استنفدت الحد اليومي</span>
                      </div>
                    )}

                    {product.min_order_qty > 1 && (
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-2">الحد الأدنى: {product.min_order_qty} قطعة</p>
                    )}

                    {product.stock_quantity > 0 && user && (!isDealer || viewedProductIds.includes(product.id)) && (
                      <Button size="sm" className="w-full mt-3 gap-2 text-xs" onClick={() => handleAddToCart(product)}>
                        <ShoppingCart className="w-3.5 h-3.5" />
                        أضف للسلة
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* ===== LIST VIEW ===== */
            <div className="space-y-3">
              {paginatedProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="w-28 sm:w-36 shrink-0 bg-white flex items-center justify-center p-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <Package className="w-10 h-10 text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{product.sku}</span>
                      {product.stock_quantity > 0 ? (
                        <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">متوفر</span>
                      ) : (
                        <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-semibold">غير متوفر</span>
                      )}
                    </div>
                    <h3 className="font-bold text-card-foreground text-sm leading-relaxed mb-1">{product.name_ar}</h3>
                    {product.product_categories && (
                      <p className="text-xs text-muted-foreground mb-2">{(product.product_categories as any).name_ar}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      {!user ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => { navigate("/auth"); }}>
                          <Lock className="w-3 h-3" />
                          سجل لعرض السعر
                        </Button>
                      ) : !isDealer ? (
                        <span className="text-primary font-black text-lg">{product.base_price.toLocaleString("ar-EG")} ج.م</span>
                      ) : viewedProductIds.includes(product.id) ? (
                        <span className="text-primary font-black text-lg">{getProductPrice(product).toLocaleString("ar-EG")} ج.م</span>
                      ) : !limitReached ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => recordView(product.id)}>
                          <Eye className="w-3 h-3" />
                          اعرض السعر
                        </Button>
                      ) : null}

                      {product.stock_quantity > 0 && user && (!isDealer || viewedProductIds.includes(product.id)) && (
                        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => handleAddToCart(product)}>
                          <ShoppingCart className="w-3 h-3" />
                          أضف للسلة
                        </Button>
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
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (currentPage <= 4) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        currentPage === page
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => { setCurrentPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="gap-1"
              >
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <SpecialOffers brandKey={config.brandKey} />
      <RelatedProducts
        allProducts={products || []}
        currentCategoryId={filters.categoryId}
        onAddToCart={handleAddToCart}
        getPrice={getProductPrice}
        isDealer={isDealer}
      />
      <MaintenanceBundles />

      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
        price={
          selectedProduct
            ? !user ? null
            : !isDealer ? selectedProduct.base_price
            : viewedProductIds.includes(selectedProduct.id) ? getProductPrice(selectedProduct)
            : null
            : null
        }
        priceLabel={
          selectedProduct && user
            ? isDealer && viewedProductIds.includes(selectedProduct.id)
              ? "سعر الجملة الخاص بك"
              : !isDealer ? "سعر قطاعي" : undefined
            : undefined
        }
        canAddToCart={!!user && (!isDealer || (selectedProduct && viewedProductIds.includes(selectedProduct.id)))}
        onAddToCart={handleAddToCart}
        isLoggedIn={!!user}
        isDealer={isDealer}
        onLoginPrompt={() => {
          toast({ title: "يجب تسجيل الدخول أولاً", description: "سجل دخولك لتتمكن من عرض أسعار المنتجات" });
          navigate("/auth");
        }}
        onRevealPrice={(productId) => recordView(productId)}
        remainingViews={DAILY_LIMIT - dailyViewCount}
        limitReached={limitReached}
      />

      <Footer />
    </div>
  );
};

export default ProductsPage;
