import { motion } from "framer-motion";
import { Package, ShoppingCart, Flame, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  brandKey?: string;
}

const SpecialOffers = ({ brandKey }: Props) => {
  const { addItem } = useCart();

  const { data: offers, isLoading } = useQuery({
    queryKey: ["special_offers", brandKey],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("is_active", true)
        .eq("is_on_sale", true)
        .not("sale_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(8);

      if (brandKey) {
        query = query.eq("brand", brandKey as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = (product: any) => {
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

  if (isLoading || !offers || offers.length === 0) return null;

  return (
    <section className="py-10 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-destructive" />
          <h2 className="text-xl font-bold text-foreground">العروض الخاصة</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">خصومات حصرية لفترة محدودة — اغتنم الفرصة!</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {offers.map((product: any, i: number) => {
            const discount = Math.round(((product.base_price - product.sale_price) / product.base_price) * 100);
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-destructive/20 rounded-lg overflow-hidden hover:border-destructive/50 hover:shadow-lg transition-all group relative"
              >
                {/* Discount badge */}
                <div className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  {discount}%-
                </div>

                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground/20" />
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <p className="text-[10px] font-mono text-muted-foreground mb-1">{product.sku}</p>
                  <h4 className="text-xs font-bold text-card-foreground leading-relaxed mb-2 line-clamp-2">
                    {product.name_ar}
                  </h4>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-destructive font-black text-base">
                      {product.sale_price.toLocaleString("ar-EG")} ج.م
                    </span>
                    <span className="text-muted-foreground line-through text-[11px] mb-0.5">
                      {product.base_price.toLocaleString("ar-EG")}
                    </span>
                  </div>
                  {product.stock_quantity > 0 && (
                    <Button size="sm" className="w-full gap-1 text-xs h-7" onClick={() => handleAdd(product)}>
                      <ShoppingCart className="w-3 h-3" />
                      أضف للسلة
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SpecialOffers;
