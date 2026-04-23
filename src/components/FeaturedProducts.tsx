import { motion } from "framer-motion";
import { Package, ShoppingCart, Eye, ChevronLeft, Lock, Tag } from "lucide-react";
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

const FeaturedProducts = () => {
  const { addItem } = useCart();
  const { user, isDealer, dealerAccount } = useAuth();
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

  // Fetch tier prices for dealers (wholesale price from ERP sync)
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

  const { data: products, isLoading } = useQuery({
    queryKey: ["featured_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .eq("is_featured", true)
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
      <section className="relative py-20 md:py-28 bg-muted/30 overflow-hidden section-glow">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="h-8 w-48 bg-muted rounded-lg mx-auto mb-4 animate-pulse" />
            <div className="h-4 w-96 bg-muted rounded-lg mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="aspect-square bg-muted rounded-lg mb-3" />
                <div className="h-3 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <>
      <section className="relative py-14 md:py-28 bg-muted/30 overflow-hidden section-glow">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-4">
              منتجاتنا <span className="text-primary">المميزة</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              اختيار متميز من قطع الغيار الأصلية والمنتجات عالية الجودة
            </p>
          </motion.div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 max-w-6xl mx-auto mb-10">
            {products.map((product: any, i: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  delay: 0.1 + i * 0.08,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
                onClick={() => setSelectedProduct(product)}
                className="group cursor-pointer bg-card border-2 border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

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
                  <p className="text-[8px] sm:text-[10px] font-mono text-muted-foreground mb-1">
                    {product.sku}
                  </p>
                  <h4 className="text-[11px] sm:text-sm font-black text-foreground leading-relaxed mb-2 line-clamp-2 min-h-[2.2rem]">
                    {product.name_ar}
                  </h4>

                  {/* Price */}
                  <div className="flex items-end gap-2 mb-3">
                    {!user ? (
                      <span className="text-muted-foreground font-bold text-sm">
                        سجّل لرؤية السعر
                      </span>
                    ) : isDealer ? (
                      viewedProductIds.includes(product.id) ? (
                        <span className="text-primary font-black text-lg">
                          {getDealerPrice(product).toLocaleString("ar-EG")} ج.م
                        </span>
                      ) : limitReached ? (
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><Lock className="w-3 h-3" />استنفدت الحد اليومي</span>
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 text-primary border-primary/30" onClick={(e) => recordView(product.id, e)}>
                          <Tag className="w-3.5 h-3.5" />تسعير ({DAILY_LIMIT - dailyViewCount} متبقي)
                        </Button>
                      )
                    ) : (
                      product.sale_price ? (
                        <>
                          <span className="text-primary font-black text-lg">
                            {product.sale_price.toLocaleString("ar-EG")} ج.م
                          </span>
                          <span className="text-muted-foreground line-through text-xs mb-0.5">
                            {product.base_price.toLocaleString("ar-EG")}
                          </span>
                        </>
                      ) : (
                        <span className="text-foreground font-black text-lg">
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
                        className="flex-1 gap-1.5 text-xs h-9 font-bold"
                        onClick={(e) => handleAdd(product, e)}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        أضف للسلة
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-9 font-bold"
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
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="gap-2.5 font-black shadow-lg shadow-primary/20 text-base px-10 py-7" asChild>
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
      </section>

      {/* Product Detail Dialog */}
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
