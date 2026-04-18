import { useEffect, useState } from "react";
import { LazyImage } from "@/components/ui/lazy-image";
import { motion } from "framer-motion";
import { Clock, Package, Tag, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ViewedProduct {
  id: string;
  name_ar: string;
  name_en: string | null;
  sku: string;
  image_url: string | null;
  base_price: number;
  stock_quantity: number;
  viewed_at: string;
}

interface Props {
  userId: string;
  isRTL: boolean;
  onPriceItem?: (product: ViewedProduct) => void;
  onAddToOrder?: (product: { id: string; sku: string; name_ar: string; name_en: string | null }) => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

const DealerRecentlyViewed = ({ userId, isRTL, onPriceItem, onAddToOrder }: Props) => {
  const [products, setProducts] = useState<ViewedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: views } = await supabase
        .from("dealer_price_views")
        .select("product_id, viewed_at")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(15);

      if (!views || views.length === 0) { setLoading(false); return; }

      // Deduplicate
      const seen = new Set<string>();
      const uniqueViews = views.filter(v => {
        if (seen.has(v.product_id)) return false;
        seen.add(v.product_id);
        return true;
      }).slice(0, 10);

      const productIds = uniqueViews.map(v => v.product_id);
      const { data: prods } = await supabase
        .from("products")
        .select("id, name_ar, name_en, sku, image_url, base_price, stock_quantity")
        .in("id", productIds)
        .eq("is_active", true);

      if (prods) {
        const viewMap = new Map(uniqueViews.map(v => [v.product_id, v.viewed_at]));
        const result: ViewedProduct[] = prods.map(p => ({
          ...p,
          name_en: p.name_en ?? null,
          image_url: p.image_url ?? null,
          viewed_at: viewMap.get(p.id) || "",
        }));
        result.sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime());
        setProducts(result);
      }
      setLoading(false);
    })();
  }, [userId]);

  if (loading || products.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease }}
      className="mt-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-blue-500/10 to-blue-500/5 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          {isRTL ? "شاهدته مؤخراً" : "Recently Viewed"}
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.32 + i * 0.04, ease }}
            className="shrink-0 w-[140px] sm:w-[155px]"
          >
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden group
              shadow-[0_1px_3px_rgba(0,0,0,0.04)]
              hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]
              hover:border-blue-500/20
              transition-all duration-500"
            >
              <div className="aspect-square bg-gradient-to-br from-muted/10 to-muted/30 relative overflow-hidden flex items-center justify-center">
                <LazyImage
                  src={p.image_url}
                  alt={p.name_ar}
                  wrapperClassName="absolute inset-0 bg-transparent"
                  className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-700"
                />
                <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ring-[2.5px] ring-card z-10 ${p.stock_quantity > 0 ? "bg-emerald-500" : "bg-muted-foreground/25"}`} />
              </div>
              <div className="p-2.5 border-t border-border/20">
                <p className="text-[11px] font-bold text-foreground line-clamp-1 mb-0.5">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                <p className="text-[9px] text-muted-foreground font-mono mb-2">{p.sku}</p>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-[10px] font-bold gap-0.5 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onPriceItem?.(p)}
                  >
                    <Tag className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-[10px] font-bold gap-0.5 rounded-lg"
                    onClick={() => onAddToOrder?.({ id: p.id, sku: p.sku, name_ar: p.name_ar, name_en: p.name_en })}
                    disabled={p.stock_quantity === 0}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

export default DealerRecentlyViewed;
