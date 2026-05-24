import { motion } from "framer-motion";
import { Package, ShoppingCart, Eye, ChevronLeft, Lock, Tag, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { LazyImage } from "@/components/ui/lazy-image";
import { Link } from "react-router-dom";

const DAILY_LIMIT = 20;

interface FeaturedProductsProps {
  categorySlugs?: string[];
}

const FeaturedProducts = ({ categorySlugs }: FeaturedProductsProps = {}) => {

  const { addItem } = useCart();
  const { user, isDealer, dealerAccount } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const queryClient = useQueryClient();

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

  const { data: tierPrices } = useQuery({
    queryKey: ["tier_prices_featured", dealerAccount?.tier],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_tier_prices")
        .select("product_id, price")
        .eq("tier", dealerAccount!.tier as any);
      const map: Record<string, number> = {};
      (data || []).forEach((tp) => { map[tp.product_id] = tp.price; });
      return map;
    },
    enabled: !!dealerAccount?.tier,
  });

  const getDealerPrice = useCallback((product: any) => {
    if (tierPrices && tierPrices[product.id]) return tierPrices[product.id];
    return product.base_price;
  }, [tierPrices]);

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

  // Popular products: top-ordered first, fallback to recent in-stock
  // When categorySlugs provided → filter by those categories instead.
  const catKey = categorySlugs?.join(",") || "all";
  const { data: products, isLoading } = useQuery({
    queryKey: ["popular_products_v2", catKey],
    queryFn: async () => {
      // Resolve category ids if filtering
      let categoryIds: string[] | null = null;
      if (categorySlugs && categorySlugs.length) {
        const { data: cats } = await supabase
          .from("product_categories")
          .select("id")
          .in("slug", categorySlugs);
        categoryIds = (cats || []).map((c: any) => c.id);
        if (!categoryIds.length) return [];
      }

      const { data: orderRows } = await supabase
        .from("order_items")
        .select("product_id, quantity");
      const counts: Record<string, number> = {};
      (orderRows || []).forEach((r: any) => {
        if (!r.product_id) return;
        counts[r.product_id] = (counts[r.product_id] || 0) + (r.quantity || 0);
      });
      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      let topProducts: any[] = [];
      if (topIds.length) {
        let q = supabase
          .from("products")
          .select("*, product_categories(name_ar)")
          .in("id", topIds.slice(0, 100))
          .eq("is_active", true)
          .gt("stock_quantity", 0)
          .not("image_url", "is", null)
          .neq("image_url", "");
        if (categoryIds) q = q.in("category_id", categoryIds);
        const { data } = await q;
        topProducts = (data || []).sort(
          (a: any, b: any) => (counts[b.id] || 0) - (counts[a.id] || 0)
        );
      }

      if (topProducts.length >= 8) return topProducts.slice(0, 8);

      const excludeIds = topProducts.map((p) => p.id);

      // Fallback 1: Toyota Genuine parts with images
      let gq = supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("is_active", true)
        .eq("brand", "toyota_genuine")
        .gt("stock_quantity", 0)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .not("id", "in", `(${excludeIds.length ? excludeIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
        .order("created_at", { ascending: false })
        .limit(8 - topProducts.length);
      if (categoryIds) gq = gq.in("category_id", categoryIds);
      const { data: genuine } = await gq;

      let combined = [...topProducts, ...(genuine || [])];
      if (combined.length >= 8) return combined.slice(0, 8);

      // Fallback 2: any other in-stock with image
      const excludeIds2 = combined.map((p) => p.id);
      let fq = supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .not("id", "in", `(${excludeIds2.length ? excludeIds2.join(",") : "00000000-0000-0000-0000-000000000000"})`)
        .order("created_at", { ascending: false })
        .limit(8 - combined.length);
      if (categoryIds) fq = fq.in("category_id", categoryIds);
      const { data: fillers } = await fq;

      return [...combined, ...(fillers || [])].slice(0, 8);
    },
  });


  const handleAdd = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const cartItem: CartItem = {
      id: product.id,
      name_ar: product.name_ar,
      sku: product.sku,
      image_url: product.image_url,
      unit_price: isDealer ? getDealerPrice(product) : (product.sale_price || product.base_price),
      quantity: product.min_order_qty || 1,
      stock_quantity: product.stock_quantity,
      min_order_qty: product.min_order_qty,
      brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  };

  if (isLoading) {
    return (
      <div className="px-4 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 max-w-6xl mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 animate-pulse">
              <div className="aspect-[4/3] bg-white/5 rounded-lg mb-3" />
              <div className="h-3 bg-white/10 rounded mb-2" />
              <div className="h-3 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <>
      <div className="px-4 py-10 md:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 max-w-6xl mx-auto mb-10">
          {products.map((product: any, i: number) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: 0.05 + i * 0.06,
                duration: 0.5,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              onClick={() => setSelectedProduct(product)}
              className="group cursor-pointer relative bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-toyota-red/50 transition-all duration-300 hover:shadow-xl hover:shadow-toyota-red/20"
            >
              {/* Top hairline */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />

              {/* Popular badge */}
              {i < 3 && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-toyota-red/90 backdrop-blur-sm">
                  <Flame className="w-3 h-3 text-white" />
                  <span className="text-[9px] font-black text-white tracking-wider">الأكثر طلباً</span>
                </div>
              )}

              {/* Image */}
              <div className="aspect-[4/3] bg-white relative overflow-hidden p-2 sm:p-4">
                {product.image_url ? (
                  <LazyImage
                    src={product.image_url}
                    alt={product.name_ar}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                    optimizeWidth={400}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-2.5 sm:p-4 relative z-10">
                <p className="text-[8px] sm:text-[10px] font-mono text-white/40 mb-1">
                  {product.sku}
                </p>
                <h4 className="text-[11px] sm:text-sm font-black text-white leading-relaxed mb-2 line-clamp-2 min-h-[2.2rem]">
                  {product.name_ar}
                </h4>

                {/* Price */}
                <div className="flex items-end gap-2 mb-3 min-h-[28px]">
                  {!user ? (
                    <span className="text-white/60 font-bold text-xs sm:text-sm">
                      سجّل لرؤية السعر
                    </span>
                  ) : isDealer ? (
                    viewedProductIds.includes(product.id) ? (
                      <span className="text-toyota-red font-black text-base sm:text-lg">
                        {getDealerPrice(product).toLocaleString("ar-EG")} ج.م
                      </span>
                    ) : limitReached ? (
                      <span className="text-white/50 text-xs flex items-center gap-1"><Lock className="w-3 h-3" />استنفدت الحد</span>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 text-toyota-red border-toyota-red/40 bg-transparent hover:bg-toyota-red/10" onClick={(e) => recordView(product.id, e)}>
                        <Tag className="w-3.5 h-3.5" />تسعير ({DAILY_LIMIT - dailyViewCount})
                      </Button>
                    )
                  ) : (
                    product.sale_price ? (
                      <>
                        <span className="text-toyota-red font-black text-base sm:text-lg">
                          {product.sale_price.toLocaleString("ar-EG")} ج.م
                        </span>
                        <span className="text-white/40 line-through text-xs mb-0.5">
                          {product.base_price.toLocaleString("ar-EG")}
                        </span>
                      </>
                    ) : (
                      <span className="text-white font-black text-base sm:text-lg">
                        {product.base_price.toLocaleString("ar-EG")} ج.م
                      </span>
                    )
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {product.stock_quantity > 0 && user && (!isDealer || viewedProductIds.includes(product.id)) && (
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 text-xs h-9 font-bold bg-toyota-red hover:bg-toyota-red/90 text-white"
                      onClick={(e) => handleAdd(product, e)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      أضف للسلة
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-9 font-bold bg-transparent border-white/15 text-white hover:bg-white/10 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    عرض
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Button size="lg" className="gap-2.5 font-black shadow-lg shadow-toyota-red/30 text-base px-10 py-7 bg-toyota-red hover:bg-toyota-red/90 text-white" asChild>
              <Link to="/products">
                تصفّح جميع المنتجات
                <motion.span
                  animate={{ x: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </motion.span>
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {selectedProduct && (
        <ProductDetailDialog
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          price={!user ? null : isDealer ? (viewedProductIds.includes(selectedProduct.id) ? getDealerPrice(selectedProduct) : null) : (selectedProduct.sale_price || selectedProduct.base_price)}
          priceLabel={!user ? "سجّل لرؤية السعر" : isDealer && viewedProductIds.includes(selectedProduct.id) ? "سعر الجملة الخاص بك" : !isDealer ? "سعر قطاعي" : undefined}
          isLoggedIn={!!user}
          isDealer={isDealer}
          onRevealPrice={(productId) => {
            if (!user || !isDealer || viewedProductIds.includes(productId) || limitReached) return;
            supabase.from("dealer_price_views").upsert(
              { user_id: user.id, product_id: productId, view_date: new Date().toISOString().split("T")[0] },
              { onConflict: "user_id,product_id,view_date" }
            ).then(() => {
              queryClient.invalidateQueries({ queryKey: ["dealer_views_today", user.id] });
              queryClient.invalidateQueries({ queryKey: ["dealer_daily_count", user.id] });
            });
          }}
          remainingViews={DAILY_LIMIT - dailyViewCount}
          limitReached={limitReached}
          onAddToCart={user && (!isDealer || viewedProductIds.includes(selectedProduct.id)) ? (product) => {
            const cartItem: CartItem = {
              id: product.id,
              name_ar: product.name_ar,
              sku: product.sku,
              image_url: product.image_url,
              unit_price: isDealer ? getDealerPrice(product) : (product.sale_price || product.base_price),
              quantity: product.min_order_qty || 1,
              stock_quantity: product.stock_quantity,
              min_order_qty: product.min_order_qty,
              brand: product.brand,
            };
            addItem(cartItem);
            toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
          } : undefined}
          canAddToCart={!!user && (!isDealer || viewedProductIds.includes(selectedProduct.id)) && selectedProduct.stock_quantity > 0}
        />
      )}
    </>
  );
};

export default FeaturedProducts;
