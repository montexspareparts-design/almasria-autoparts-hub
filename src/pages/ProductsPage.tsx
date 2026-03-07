import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, Package, ShoppingCart, Eye, AlertTriangle } from "lucide-react";
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

const brandConfig: Record<string, { title: string; subtitle: string; description: string; badge: string; brandKey: string; logo: string }> = {
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
    description: "DENSO هي واحدة من أكبر شركات تصنيع قطع غيار السيارات في العالم. متخصصة في أنظمة التكييف، الكهرباء، الفلاتر، وأنظمة الوقود.",
    badge: "وكيل معتمد",
    brandKey: "denso",
    logo: brandDenso,
  },
  "aisin": {
    title: "AISIN",
    subtitle: "قطع غيار أيسن اليابانية",
    description: "AISIN هي شريك تويوتا الاستراتيجي لتصنيع قطع غيار القوة والنقل. متخصصة في الدبرياج، طلمبات الزيت، ماستر الفرامل، والمكونات الميكانيكية.",
    badge: "وكيل معتمد",
    brandKey: "aisin",
    logo: brandAisin,
  },
};

const ProductsPage = () => {
  const { brand } = useParams<{ brand: string }>();
  const navigate = useNavigate();
  const { isDealer, user, dealerAccount } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const config = brand ? brandConfig[brand] : null;
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    model: null,
    year: null,
    chassisNumber: "",
    partNumber: "",
    categoryId: null,
    priceMin: "",
    priceMax: "",
  });
  const DAILY_LIMIT = 20;

  // Track viewed product IDs today (for dealers)
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
    if (viewedProductIds.includes(productId)) return; // already viewed
    if (limitReached) return;

    await supabase.from("dealer_price_views").upsert(
      { user_id: user.id, product_id: productId, view_date: new Date().toISOString().split("T")[0] },
      { onConflict: "user_id,product_id,view_date" }
    );
    queryClient.invalidateQueries({ queryKey: ["dealer_views_today", user.id] });
  }, [user, isDealer, viewedProductIds, limitReached, queryClient]);

  const canSeePrice = (productId: string) => {
    if (!user) return false; // not logged in
    if (!isDealer) return true; // logged in, non-dealer sees retail
    return viewedProductIds.includes(productId) || !limitReached;
  };

  // Fetch tier prices for dealers
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
    if (isDealer && tierPrices && tierPrices[product.id]) {
      return tierPrices[product.id];
    }
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
    return products.filter((p) => {
      const matchesSearch =
        !filters.search ||
        p.name_ar.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.sku.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory =
        !filters.categoryId || p.category_id === filters.categoryId;
      const matchesModel =
        !filters.model || p.name_ar.includes(filters.model);
      const matchesYear =
        !filters.year || p.name_ar.includes(filters.year);
      const matchesPartNumber =
        !filters.partNumber || p.sku.toLowerCase().includes(filters.partNumber.toLowerCase());
      const price = p.base_price;
      const matchesPriceMin = !filters.priceMin || price >= Number(filters.priceMin);
      const matchesPriceMax = !filters.priceMax || price <= Number(filters.priceMax);
      return matchesSearch && matchesCategory && matchesModel && matchesYear && matchesPartNumber && matchesPriceMin && matchesPriceMax;
    });
  }, [products, filters]);

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">صفحة غير موجودة</h1>
          <Button asChild>
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <BrandHeroBanner
        logo={config.logo}
        title={config.title}
        subtitle={config.subtitle}
        description={config.description}
        badge={config.badge}
      />

      <section className="py-6 bg-background border-b border-border sticky top-16 z-30">
        <div className="container mx-auto px-4">
          {/* Dealer promotion banner */}
          {!isDealer && (
            <div className="bg-muted border border-primary/20 rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <p className="text-foreground text-sm">
                  <strong>تاجر معتمد؟</strong> سجل دخولك للحصول على أسعار الجملة الخاصة.
                </p>
              </div>
              <Button size="sm" className="shrink-0" asChild>
                <Link to="/dealer-login">دخول التجار</Link>
              </Button>
            </div>
          )}

          {/* Dealer daily limit banner */}
          {isDealer && (
            <div className={`rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-3 border ${
              limitReached ? "bg-destructive/10 border-destructive/30" : "bg-muted border-primary/20"
            }`}>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary shrink-0" />
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

      {/* Products Grid */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground">جرب تغيير كلمة البحث أو الفلتر</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 ease-out group"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-white relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name_ar}
                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                  {/* Part Number Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {product.sku}
                    </span>
                    {product.stock_quantity > 0 ? (
                      <span className="text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">متوفر</span>
                    ) : (
                      <span className="text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-semibold">غير متوفر</span>
                    )}
                  </div>

                  {/* Product Name */}
                  <h3 className="font-bold text-card-foreground text-sm leading-relaxed mb-2 group-hover:text-primary transition-colors">
                    {product.name_ar}
                  </h3>

                  {/* Category */}
                  {product.product_categories && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {(product.product_categories as any).name_ar}
                    </p>
                  )}

                  {/* Price */}
                  {!user ? (
                    /* Not logged in - prompt to register */
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1 gap-2"
                      onClick={() => {
                        toast({ title: "يجب تسجيل الدخول أولاً", description: "سجل دخولك لتتمكن من عرض أسعار المنتجات" });
                        navigate("/auth");
                      }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      سجل دخولك لعرض السعر
                    </Button>
                  ) : !isDealer ? (
                    /* Logged in visitor - show retail price */
                    <>
                      <div className="text-primary font-black text-lg">
                        {product.base_price.toLocaleString("ar-EG")} ج.م
                      </div>
                      <p className="text-[11px] text-muted-foreground">سعر قطاعي</p>
                    </>
                  ) : viewedProductIds.includes(product.id) ? (
                    /* Dealer - already viewed today */
                    <>
                      <div className="text-primary font-black text-lg">
                        {getProductPrice(product).toLocaleString("ar-EG")} ج.م
                      </div>
                      <p className="text-[11px] text-green-600 font-semibold">سعر الجملة الخاص بك</p>
                    </>
                  ) : !limitReached ? (
                    /* Dealer - not viewed, can still view */
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1 gap-2"
                      onClick={() => recordView(product.id)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      اعرض السعر ({DAILY_LIMIT - dailyViewCount} متبقي)
                    </Button>
                  ) : (
                    /* Dealer - limit reached */
                    <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>استنفدت الحد اليومي (20 صنف)</span>
                    </div>
                  )}

                  {/* Min Order */}
                  {product.min_order_qty > 1 && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      الحد الأدنى: {product.min_order_qty} قطعة
                    </p>
                  )}

                  {/* Add to Cart - visitors always, dealers only if viewed */}
                  {product.stock_quantity > 0 && (!isDealer || viewedProductIds.includes(product.id)) && (
                    <Button
                      size="sm"
                      className="w-full mt-3 gap-2"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      أضف للسلة
                    </Button>
                  )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Special Offers */}
      <SpecialOffers brandKey={config.brandKey} />

      {/* Related Products */}
      <RelatedProducts
        allProducts={products || []}
        currentCategoryId={filters.categoryId}
        onAddToCart={handleAddToCart}
        getPrice={getProductPrice}
        isDealer={isDealer}
      />

      {/* Maintenance Bundles */}
      <MaintenanceBundles />

      <Footer />
    </div>
  );
};

export default ProductsPage;
