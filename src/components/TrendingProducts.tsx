import { motion } from "framer-motion";
import { TrendingUp, Star, Clock, ShoppingCart, Eye, ChevronLeft, Lock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DAILY_LIMIT = 20;

const TrendingProducts = () => {
  const { addItem } = useCart();
  const { user, isDealer } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const queryClient = useQueryClient();

  // Dealer price view tracking
  const { data: viewedProductIds = [] } = useQuery({
    queryKey: ["dealer_views_today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("dealer_price_views")
        .select("product_id")
        .eq("user_id", user!.id)
        .eq("view_date", today);
      return (data || []).map((v) => v.product_id);
    },
    enabled: !!isDealer && !!user,
  });

  const { data: dailyViewCount = 0 } = useQuery({
    queryKey: ["dealer_daily_count", user?.id],
    queryFn: async () => {
      const count = await supabase.rpc("get_daily_view_count", { _user_id: user!.id });
      return (count.data as number) || 0;
    },
    enabled: !!isDealer && !!user,
  });

  const limitReached = dailyViewCount >= DAILY_LIMIT;

  const recordView = useCallback(async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !isDealer || viewedProductIds.includes(productId) || limitReached) return;
    await supabase.from("dealer_price_views").upsert(
      { user_id: user.id, product_id: productId, view_date: new Date().toISOString().split("T")[0] },
      { onConflict: "user_id,product_id,view_date" }
    );
    queryClient.invalidateQueries({ queryKey: ["dealer_views_today", user.id] });
    queryClient.invalidateQueries({ queryKey: ["dealer_daily_count", user.id] });
  }, [user, isDealer, viewedProductIds, limitReached, queryClient]);

  // Best sellers - based on real order_items data
  const { data: bestSellers, isLoading: loadingBest } = useQuery({
    queryKey: ["best_sellers"],
    queryFn: async () => {
      // Get top product IDs by sales volume
      const { data: topIds, error: idsError } = await supabase.rpc("get_best_selling_products", { _limit: 8 });
      if (idsError) throw idsError;
      if (!topIds || topIds.length === 0) {
        // Fallback to featured products if no orders yet
        const { data, error } = await supabase
          .from("products")
          .select("*, product_categories(name_ar)")
          .eq("is_active", true)
          .eq("is_featured", true)
          .limit(8);
        if (error) throw error;
        return data;
      }
      // Fetch full product details for the top sellers
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .in("id", topIds as string[])
        .eq("is_active", true);
      if (error) throw error;
      // Preserve order from RPC
      const orderMap = new Map((topIds as string[]).map((id, i) => [id, i]));
      return (data || []).sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));
    },
  });

  // Most popular - on sale products
  const { data: popular, isLoading: loadingPopular } = useQuery({
    queryKey: ["popular_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("is_active", true)
        .eq("is_on_sale", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  // New arrivals
  const { data: newArrivals, isLoading: loadingNew } = useQuery({
    queryKey: ["new_arrivals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const cartItem: CartItem = {
      id: product.id,
      name_ar: product.name_ar,
      sku: product.sku,
      image_url: product.image_url,
      unit_price: product.sale_price || product.base_price,
      quantity: product.min_order_qty || 1,
      stock_quantity: product.stock_quantity,
      min_order_qty: product.min_order_qty,
      brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  };

  const tabs = [
    { id: "best", label: "الأكثر مبيعاً", icon: TrendingUp, data: bestSellers, loading: loadingBest },
    { id: "popular", label: "عروض مميزة", icon: Star, data: popular, loading: loadingPopular },
    { id: "new", label: "وصل حديثاً", icon: Clock, data: newArrivals, loading: loadingNew },
  ];

  const renderProducts = (products: any[] | undefined, loading: boolean) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse h-64" />
          ))}
        </div>
      );
    }

    if (!products?.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد منتجات في هذا القسم حالياً
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.slice(0, 8).map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedProduct(product)}
          >
            {/* Image */}
            <div className="relative aspect-square bg-white p-3 overflow-hidden">
              {product.is_on_sale && (
                <Badge className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5">
                  خصم
                </Badge>
              )}
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name_ar}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Eye className="w-8 h-8" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-1.5">
              <p className="text-[11px] text-muted-foreground font-mono">{product.sku}</p>
              <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-snug min-h-[2.5rem]">
                {product.name_ar}
              </h4>
              {product.product_categories?.name_ar && (
                <p className="text-[10px] text-muted-foreground">{product.product_categories.name_ar}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-baseline gap-1">
                  {user ? (
                    product.is_on_sale && product.sale_price ? (
                      <>
                        <span className="text-sm font-black text-primary">{product.sale_price} ج.م</span>
                        <span className="text-[10px] text-muted-foreground line-through">{product.base_price}</span>
                      </>
                    ) : (
                      <span className="text-sm font-black text-primary">{product.base_price} ج.م</span>
                    )
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">سجّل لرؤية السعر</span>
                  )}
                </div>
                {user && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-primary hover:bg-primary/10"
                    onClick={(e) => handleAdd(product, e)}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-2">
            تسوّق حسب <span className="text-primary">الأكثر طلباً</span>
          </h2>
          <p className="text-muted-foreground text-center text-sm">
            اكتشف المنتجات الرائجة والأكثر طلباً من عملائنا
          </p>
        </motion.div>

        <Tabs defaultValue="best" dir="rtl" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-6 bg-muted/50">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {renderProducts(tab.data, tab.loading)}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
        price={user ? (selectedProduct?.sale_price || selectedProduct?.base_price) : null}
        priceLabel={user ? undefined : "سجّل لرؤية السعر"}
        isLoggedIn={!!user}
      />
    </section>
  );
};

export default TrendingProducts;
