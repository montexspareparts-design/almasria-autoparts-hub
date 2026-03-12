import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ShoppingCart, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

interface RecommendedProduct {
  id: string;
  name_ar: string;
  sku: string;
  image_url: string | null;
  base_price: number;
  brand: string;
  category_name?: string;
}

const brandLabels: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX",
  denso: "DENSO",
  aisin: "AISIN",
};

const DealerRecommendations = ({ userId, tier }: { userId: string; tier?: string }) => {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      // 1. Get all product IDs this dealer has ordered
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, orders!inner(user_id)")
        .eq("orders.user_id", userId);

      const orderedProductIds = [...new Set((orderItems || []).map(i => i.product_id))];

      if (orderedProductIds.length === 0) {
        // No purchase history — show featured/popular products instead
        const { data: featured } = await supabase
          .from("products")
          .select("id, name_ar, sku, image_url, base_price, brand, category_id")
          .eq("is_active", true)
          .eq("is_featured", true)
          .limit(8);
        
        setProducts((featured || []).map(p => ({
          ...p,
          brand: p.brand as string,
        })));
        setLoading(false);
        return;
      }

      // 2. Get categories and brands from ordered products
      const { data: orderedProducts } = await supabase
        .from("products")
        .select("category_id, brand")
        .in("id", orderedProductIds);

      const categories = [...new Set((orderedProducts || []).map(p => p.category_id).filter(Boolean))] as string[];
      const brands = [...new Set((orderedProducts || []).map(p => p.brand))];

      // 3. Fetch products in same categories/brands, excluding already ordered
      let query = supabase
        .from("products")
        .select("id, name_ar, sku, image_url, base_price, brand, category_id")
        .eq("is_active", true)
        .limit(12);

      if (categories.length > 0) {
        query = query.in("category_id", categories);
      }

      const { data: candidates } = await query;

      // Filter out already-ordered products and shuffle
      const filtered = (candidates || [])
        .filter(p => !orderedProductIds.includes(p.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);

      setProducts(filtered.map(p => ({
        ...p,
        brand: p.brand as string,
      })));
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: RecommendedProduct) => {
    addToCart({
      id: product.id,
      name: product.name_ar,
      price: product.base_price,
      image: product.image_url || "/placeholder.svg",
      sku: product.sku,
      quantity: 1,
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
          <Sparkles className="w-4 h-4 text-primary" />
          مقترحات لك
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
          <Sparkles className="w-4 h-4 text-primary" />
          مقترحات لك
        </h3>
        <span className="text-[10px] text-muted-foreground">بناءً على مشترياتك</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {products.map(p => (
          <div
            key={p.id}
            className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            {/* Image */}
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

            {/* Info */}
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
