import { motion } from "framer-motion";
import { Package, ShoppingCart, Tag, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

const MaintenanceBundles = () => {
  const { addItem } = useCart();

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["maintenance_bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_bundles")
        .select("*, bundle_items(*, products(*))")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !bundles || bundles.length === 0) return null;

  const handleAddBundle = (bundle: any) => {
    const items = bundle.bundle_items || [];
    items.forEach((bi: any) => {
      if (bi.products) {
        const product = bi.products;
        const cartItem: CartItem = {
          id: product.id,
          name_ar: product.name_ar,
          sku: product.sku,
          image_url: product.image_url,
          unit_price: product.base_price,
          quantity: bi.quantity || 1,
          stock_quantity: product.stock_quantity,
          min_order_qty: product.min_order_qty,
          brand: product.brand,
        };
        addItem(cartItem);
      }
    });
    toast({ title: "تمت إضافة الباقة للسلة ✅", description: bundle.name_ar });
  };

  return (
    <section className="py-10 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">باقات الصيانة</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">وفّر أكتر لما تشتري باقة كاملة — قطع مرتبطة ببعض بسعر مخفض</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((bundle: any, i: number) => {
            const savings = bundle.original_price - bundle.bundle_price;
            const savingsPercent = Math.round((savings / bundle.original_price) * 100);
            const items = bundle.bundle_items || [];

            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border-2 border-primary/20 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
              >
                {/* Discount badge */}
                {savingsPercent > 0 && (
                  <div className="bg-primary text-primary-foreground px-4 py-1.5 flex items-center justify-center gap-2">
                    <Percent className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold">وفّر {savingsPercent}%</span>
                  </div>
                )}

                <div className="p-5">
                  <h3 className="text-lg font-black text-card-foreground mb-2">{bundle.name_ar}</h3>
                  {bundle.description_ar && (
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{bundle.description_ar}</p>
                  )}

                  {/* Bundle items list */}
                  <div className="space-y-2 mb-4">
                    {items.map((bi: any) => (
                      <div key={bi.id} className="flex items-center gap-2 text-xs">
                        <Tag className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-card-foreground">{bi.products?.name_ar || "منتج"}</span>
                        {bi.quantity > 1 && (
                          <span className="text-muted-foreground">×{bi.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="flex items-end gap-3 mb-4">
                    <div className="text-primary font-black text-2xl">
                      {bundle.bundle_price.toLocaleString("ar-EG")} ج.م
                    </div>
                    {savings > 0 && (
                      <div className="text-muted-foreground line-through text-sm mb-0.5">
                        {bundle.original_price.toLocaleString("ar-EG")} ج.م
                      </div>
                    )}
                  </div>

                  <Button className="w-full gap-2" onClick={() => handleAddBundle(bundle)}>
                    <ShoppingCart className="w-4 h-4" />
                    أضف الباقة للسلة
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MaintenanceBundles;
