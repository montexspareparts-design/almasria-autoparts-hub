import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, TrendingUp, Car, Bus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ProductDetailDialog from "@/components/ProductDetailDialog";

// Keywords that map vehicle types to product names
const VEHICLE_KEYWORDS: Record<string, string[]> = {
  sedan: [
    "كورولا", "كامري", "ياريس", "بيلتا", "لاند كروزر", "لاندكروزر", "لاندكرورز",
    "فورتشنر", "فورتشينر", "راف فور", "راف4",
    "بريوس", "افالون", "اوريون", "سيينا", "راش",
  ],
  microbus: [
    "هاي اس", "هايس", "كوستر", "هاي لوكس", "هايلوكس",
  ],
};

interface DealerVehicleRecommendationsProps {
  vehicleTypes: string[];
  compact?: boolean;
}

const DealerVehicleRecommendations = ({ vehicleTypes, compact }: DealerVehicleRecommendationsProps) => {
  const { user, isDealer } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    if (vehicleTypes.length > 0) fetchRecommendations();
  }, [vehicleTypes]);

  const fetchRecommendations = async () => {
    setLoading(true);

    // Get all keywords for selected vehicle types
    const keywords = vehicleTypes.flatMap((vt) => VEHICLE_KEYWORDS[vt] || []);
    if (keywords.length === 0) { setLoading(false); return; }

    // Build OR filter for product names matching any keyword
    const orFilter = keywords.map((kw) => `name_ar.ilike.%${kw}%`).join(",");

    // Get best-selling product IDs
    const { data: bestSellingIds } = await supabase.rpc("get_best_selling_products", { _limit: 200 });

    // Fetch matching products sorted by stock (highest first)
    const { data: matchingProducts } = await supabase
      .from("products")
      .select("id, name_ar, sku, image_url, base_price, stock_quantity, brand, is_on_sale, sale_price")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .or(orFilter)
      .order("stock_quantity", { ascending: false })
      .limit(100);

    if (!matchingProducts) { setLoading(false); return; }

    // Score products: best-selling bonus + stock weight
    const bestSellingSet = new Set(bestSellingIds || []);
    const scored = matchingProducts.map((p) => ({
      ...p,
      score: (bestSellingSet.has(p.id) ? 1000 : 0) + p.stock_quantity,
    }));

    // Sort by score descending and take top items
    scored.sort((a, b) => b.score - a.score);
    setProducts(scored.slice(0, compact ? 6 : 12));
    setLoading(false);
  };

  const vehicleLabel = vehicleTypes.map((vt) =>
    vt === "sedan" ? "ملاكي" : vt === "microbus" ? "ميكروباص" : vt
  ).join(" و ");

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">الأكثر طلباً — {vehicleLabel}</h3>
        <div className="flex gap-1">
          {vehicleTypes.includes("sedan") && (
            <Badge variant="secondary" className="text-[9px] gap-1 px-1.5">
              <Car className="w-2.5 h-2.5" /> ملاكي
            </Badge>
          )}
          {vehicleTypes.includes("microbus") && (
            <Badge variant="secondary" className="text-[9px] gap-1 px-1.5">
              <Bus className="w-2.5 h-2.5" /> ميكروباص
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200 group cursor-pointer"
            onClick={() => setSelectedProduct(product)}
          >
            <div className="aspect-square bg-white relative overflow-hidden p-3">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name_ar}
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground/15" />
                </div>
              )}
              {product.is_on_sale && (
                <Badge className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[8px] px-1.5 py-0 h-4">
                  تخفيض
                </Badge>
              )}
              <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-white ${
                product.stock_quantity > 0 ? "bg-green-500" : "bg-red-400"
              }`} />
            </div>
            <div className="p-2 space-y-1">
              <p className="text-[9px] font-mono text-muted-foreground">{product.sku}</p>
              <h4 className="text-[11px] font-bold text-card-foreground line-clamp-2 leading-snug">
                {product.name_ar}
              </h4>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  متوفر: {product.stock_quantity}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        price={selectedProduct?.base_price ?? null}
      />
    </div>
  );
};

export default DealerVehicleRecommendations;
