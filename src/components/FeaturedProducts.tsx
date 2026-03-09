import { motion } from "framer-motion";
import { Package, ShoppingCart, Eye, Sparkles, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { Link } from "react-router-dom";

const FeaturedProducts = () => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["featured_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("is_active", true)
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
      unit_price: product.sale_price || product.base_price,
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
      <section className="py-20 md:py-28 bg-muted/30 overflow-hidden">
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
      <section className="py-20 md:py-28 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-14"
          >
            <p className="text-primary text-xs font-black tracking-[0.35em] uppercase mb-5">
              منتجاتنا
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-foreground leading-snug mb-3">
              منتجاتنا <span className="text-primary">المميزة</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              اختيار متميز من قطع الغيار الأصلية والمنتجات عالية الجودة
            </p>
          </motion.div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-10">
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
                <div className="aspect-square bg-white relative overflow-hidden p-4">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name_ar}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground/20" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 relative z-10">
                  <p className="text-[10px] font-mono text-muted-foreground mb-1.5">
                    {product.sku}
                  </p>
                  <h4 className="text-sm font-black text-foreground leading-relaxed mb-3 line-clamp-2 min-h-[2.5rem]">
                    {product.name_ar}
                  </h4>

                  {/* Price */}
                  <div className="flex items-end gap-2 mb-3">
                    {product.sale_price ? (
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
                        {user ? `${product.base_price.toLocaleString("ar-EG")} ج.م` : "سجّل لرؤية السعر"}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {product.stock_quantity > 0 && user && (
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
          price={selectedProduct.sale_price || selectedProduct.base_price}
          priceLabel={user ? undefined : "سجّل لرؤية السعر"}
          onAddToCart={user ? (product) => {
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
          } : undefined}
          canAddToCart={!!user && selectedProduct.stock_quantity > 0}
          isLoggedIn={!!user}
        />
      )}
    </>
  );
};

export default FeaturedProducts;
