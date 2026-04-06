import { memo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeeklyBestSellersProps {
  onProductClick: (product: any) => void;
  onAddToCart: (product: any) => void;
  isDealer: boolean;
  user: any;
  getProductPrice: (product: any) => number;
}

const WeeklyBestSellers = memo(({ onProductClick, onAddToCart, isDealer, user, getProductPrice }: WeeklyBestSellersProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: bestProducts, isLoading } = useQuery({
    queryKey: ["weekly-best-sellers"],
    queryFn: async () => {
      // Get best selling product IDs
      const { data: ids } = await supabase.rpc("get_best_selling_products", { _limit: 12 });
      if (!ids || ids.length === 0) return [];

      // Fetch product details
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .in("id", ids)
        .eq("is_active", true);

      if (!products) return [];

      // Sort by order in ids
      const idOrder = new Map(ids.map((id: string, i: number) => [id, i]));
      return products.sort((a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99));
    },
    staleTime: 10 * 60 * 1000,
  });

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = dir === "left" ? -280 : 280;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (isLoading || !bestProducts || bestProducts.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">الأكثر طلباً هذا الأسبوع</h3>
            <p className="text-[11px] text-muted-foreground">بناءً على طلبات العملاء الفعلية</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("right")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("left")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {bestProducts.map((product, idx) => {
          const price = getProductPrice(product);
          const hasImage = !!product.image_url;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="snap-start shrink-0 w-[200px] sm:w-[220px]"
            >
              <div
                onClick={() => onProductClick(product)}
                className="group bg-card border border-border/60 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full flex flex-col"
              >
                {/* Rank Badge */}
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-md">
                    {idx + 1}
                  </div>

                  {/* Image */}
                  <div className="aspect-[4/3] bg-muted/30 overflow-hidden">
                    {hasImage ? (
                      <img
                        src={product.image_url}
                        alt={product.name_ar}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-2"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                        <TrendingUp className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1 gap-1.5">
                  <p className="text-[11px] text-muted-foreground font-mono">{product.sku}</p>
                  <h4 className="text-xs font-bold text-foreground leading-relaxed line-clamp-2 flex-1">
                    {product.name_ar}
                  </h4>

                  <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-border/40">
                    {user ? (
                      <span className="text-sm font-bold text-primary">
                        {price.toLocaleString("ar-EG")} ج.م
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">سجل لعرض السعر</span>
                    )}

                    {user && !isDealer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(product);
                        }}
                      >
                        + أضف
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
});

WeeklyBestSellers.displayName = "WeeklyBestSellers";

export default WeeklyBestSellers;
