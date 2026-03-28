import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Package, Plus, Tag, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface BestSellerProduct {
  id: string;
  name_ar: string;
  name_en: string | null;
  sku: string;
  image_url: string | null;
  base_price: number;
  stock_quantity: number;
}

interface Props {
  isRTL: boolean;
  onPriceItem?: (product: BestSellerProduct) => void;
  onAddToOrder?: (product: { id: string; sku: string; name_ar: string; name_en: string | null }) => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

const DealerBestSellers = ({ isRTL, onPriceItem, onAddToOrder }: Props) => {
  const [products, setProducts] = useState<BestSellerProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Use the get_best_selling_products RPC
      const { data: ids } = await supabase.rpc("get_best_selling_products", { _limit: 8 });
      if (!ids || ids.length === 0) { setLoading(false); return; }

      const { data: prods } = await supabase
        .from("products")
        .select("id, name_ar, name_en, sku, image_url, base_price, stock_quantity")
        .in("id", ids)
        .eq("is_active", true);

      if (prods) {
        // Preserve the order from the RPC
        const prodMap = new Map(prods.map(p => [p.id, p]));
        const ordered = ids
          .map((id: string) => prodMap.get(id))
          .filter(Boolean) as BestSellerProduct[];
        setProducts(ordered);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5, ease }}
      className="mt-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-orange-500/10 to-orange-500/5 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          {isRTL ? "الأكثر مبيعاً" : "Best Sellers"}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.slice(0, 8).map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 + i * 0.04, ease }}
          >
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden group
              shadow-[0_1px_3px_rgba(0,0,0,0.04)]
              hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]
              hover:border-orange-500/15
              transition-all duration-500 relative"
            >
              {i < 3 && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-lg shadow-md shadow-orange-500/30">
                  <Flame className="w-3 h-3" />
                  #{i + 1}
                </div>
              )}
              <div className="aspect-square bg-gradient-to-br from-muted/10 to-muted/30 relative overflow-hidden flex items-center justify-center">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                  : <Package className="w-8 h-8 text-muted-foreground/10" />
                }
                <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ring-[2.5px] ring-card ${p.stock_quantity > 0 ? "bg-emerald-500" : "bg-muted-foreground/25"}`} />
              </div>
              <div className="p-3 border-t border-border/20">
                <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                <p className="text-[10px] text-muted-foreground font-mono mb-2.5">{p.sku}</p>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[11px] font-bold gap-1 rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onPriceItem?.(p)}
                  >
                    <Tag className="w-3 h-3" />{isRTL ? "تسعير" : "Price"}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-[11px] font-bold gap-1 rounded-xl shadow-sm"
                    onClick={() => onAddToOrder?.({ id: p.id, sku: p.sku, name_ar: p.name_ar, name_en: p.name_en })}
                    disabled={p.stock_quantity === 0}
                  >
                    <Plus className="w-3 h-3" />{isRTL ? "أضف" : "Add"}
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

export default DealerBestSellers;
