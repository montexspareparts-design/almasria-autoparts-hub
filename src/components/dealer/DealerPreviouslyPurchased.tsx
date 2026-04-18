import { useEffect, useState, useCallback } from "react";
import { LazyImage } from "@/components/ui/lazy-image";
import { motion } from "framer-motion";
import { RefreshCw, Package, Plus, ChevronLeft, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PurchasedProduct {
  id: string;
  name_ar: string;
  name_en: string | null;
  sku: string;
  image_url: string | null;
  base_price: number;
  stock_quantity: number;
  last_ordered: string;
  total_qty_ordered: number;
}

interface Props {
  userId: string;
  isRTL: boolean;
  onAddToOrder?: (product: { id: string; sku: string; name_ar: string; name_en: string | null }) => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

const DealerPreviouslyPurchased = ({ userId, isRTL, onAddToOrder }: Props) => {
  const [products, setProducts] = useState<PurchasedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      // Get order items for this user's delivered/processing orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("user_id", userId)
        .in("status", ["delivered", "processing", "shipped", "ready"])
        .order("created_at", { ascending: false });

      if (!orders || orders.length === 0) { setLoading(false); return; }

      const orderIds = orders.map(o => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity, order_id")
        .in("order_id", orderIds);

      if (!items || items.length === 0) { setLoading(false); return; }

      // Aggregate by product
      const productMap = new Map<string, { totalQty: number; lastOrderId: string }>();
      items.forEach(item => {
        const existing = productMap.get(item.product_id);
        if (existing) {
          existing.totalQty += item.quantity;
        } else {
          productMap.set(item.product_id, { totalQty: item.quantity, lastOrderId: item.order_id });
        }
      });

      const productIds = Array.from(productMap.keys()).slice(0, 10);
      const { data: prods } = await supabase
        .from("products")
        .select("id, name_ar, name_en, sku, image_url, base_price, stock_quantity")
        .in("id", productIds)
        .eq("is_active", true);

      if (prods) {
        const orderDateMap = new Map(orders.map(o => [o.id, o.created_at]));
        const result: PurchasedProduct[] = prods.map(p => {
          const info = productMap.get(p.id)!;
          return {
            ...p,
            name_en: p.name_en ?? null,
            image_url: p.image_url ?? null,
            last_ordered: orderDateMap.get(info.lastOrderId) || "",
            total_qty_ordered: info.totalQty,
          };
        });
        // Sort by most recently ordered
        result.sort((a, b) => new Date(b.last_ordered).getTime() - new Date(a.last_ordered).getTime());
        setProducts(result);
      }
      setLoading(false);
    })();
  }, [userId]);

  const handleReorder = useCallback((p: PurchasedProduct) => {
    onAddToOrder?.({ id: p.id, sku: p.sku, name_ar: p.name_ar, name_en: p.name_en });
    toast({ title: "✅", description: isRTL ? `تم إضافة ${p.name_ar} للطلب` : `Added ${p.name_ar} to order` });
  }, [onAddToOrder, toast, isRTL]);

  if (loading || products.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5, ease }}
      className="mt-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
          </div>
          {isRTL ? "اشتريته من قبل" : "Previously Purchased"}
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28 + i * 0.05, ease }}
            className="shrink-0 w-[160px] sm:w-[180px]"
          >
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden group
              shadow-[0_1px_3px_rgba(0,0,0,0.04)]
              hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]
              hover:border-emerald-500/20
              transition-all duration-500"
            >
              <div className="aspect-square bg-gradient-to-br from-muted/10 to-muted/30 relative overflow-hidden flex items-center justify-center">
                <LazyImage
                  src={p.image_url}
                  alt={p.name_ar}
                  wrapperClassName="absolute inset-0 bg-transparent"
                  className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-700"
                />
                {/* Reorder badge */}
                <span className="absolute top-2 right-2 text-[9px] font-bold bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/30">
                  {p.total_qty_ordered}x {isRTL ? "طلب" : "ordered"}
                </span>
                <span className={`absolute top-2.5 left-2.5 w-2 h-2 rounded-full ring-[2.5px] ring-card ${p.stock_quantity > 0 ? "bg-emerald-500 shadow-sm shadow-emerald-500/40" : "bg-muted-foreground/25"}`} />
              </div>
              <div className="p-3 border-t border-border/20">
                <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                <p className="text-[10px] text-muted-foreground font-mono mb-2">{p.sku}</p>
                <Button
                  size="sm"
                  className="w-full h-8 text-[11px] font-bold gap-1.5 rounded-xl shadow-sm shadow-primary/15"
                  onClick={() => handleReorder(p)}
                  disabled={p.stock_quantity === 0}
                >
                  <RefreshCw className="w-3 h-3" />
                  {isRTL ? "اطلب مرة تانية" : "Reorder"}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

export default DealerPreviouslyPurchased;
