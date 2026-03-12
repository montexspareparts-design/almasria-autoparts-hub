import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

interface PopularProduct {
  id: string;
  name_ar: string;
  sku: string;
  image_url: string | null;
  base_price: number;
  brand: string;
  min_order_qty: number;
  stock_quantity: number;
}

const brandLabels: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX",
  denso: "DENSO",
  aisin: "AISIN",
};

const DealerRecommendations = ({ userId, tier }: { userId: string; tier?: string }) => {
  const [products, setProducts] = useState<PopularProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    fetchPopular();
  }, []);

  const fetchPopular = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, image_url, base_price, brand, min_order_qty, stock_quantity")
        .eq("is_active", true)
        .gt("stock_quantity", 20)
        .order("stock_quantity", { ascending: false })
        .limit(8);

      setProducts((data || []).sort(() => Math.random() - 0.5));
    } catch (err) {
      console.error("Failed to fetch popular products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: PopularProduct) => {
    addItem({
      id: product.id,
      name_ar: product.name_ar,
      sku: product.sku,
      image_url: product.image_url,
      unit_price: product.base_price,
      quantity: 1,
      stock_quantity: product.stock_quantity,
      min_order_qty: product.min_order_qty,
      brand: product.brand,
    });
    toast({
      title: "تمت الإضافة",
      description: `${product.name_ar} أُضيف للسلة`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary" />
          الأكثر طلباً
        </h3>
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary" />
          الأكثر طلباً
        </h3>
        <span className="text-[10px] text-muted-foreground">متوفر للطلب الفوري</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {products.map(p => (
          <div
            key={p.id}
            className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="aspect-square bg-muted/50 relative overflow-hidden">
              <img
                src={p.image_url || "/placeholder.svg"}
                alt={p.name_ar}
                className="w-full h-full object-contain p-2"
                loading="lazy"
              />
              <Badge className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0 bg-secondary text-secondary-foreground">
                {brandLabels[p.brand] || p.brand}
              </Badge>
            </div>

            <div className="p-2.5">
              <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-relaxed mb-1">
                {p.name_ar}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono mb-2">{p.sku}</p>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-foreground">
                  {p.base_price.toLocaleString("ar-EG")} ج.م
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 hover:bg-primary/10"
                  onClick={() => handleAddToCart(p)}
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DealerRecommendations;
