import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { LazyImage } from "@/components/ui/lazy-image";
import { useDealerCart } from "@/hooks/useDealerCart";
import { toast } from "sonner";

interface PopularProduct {
  id: string;
  name_ar: string;
  sku: string;
  image_url: string | null;
  brand: string;
}

const brandLabels: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX",
  denso: "DENSO",
  aisin: "AISIN",
  fbk: "تيل فرامل FBK",
};

const DealerRecommendations = ({ userId, tier, onNavigateToQuotes }: { userId: string; tier?: string; onNavigateToQuotes?: () => void }) => {
  const { user, isDealer, dealerAccount } = useAuth();
  const { addItem } = useDealerCart();
  const [products, setProducts] = useState<PopularProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    fetchPopular();
  }, []);

  const fetchPopular = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, image_url, brand, stock_quantity")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("stock_quantity", { ascending: false })
        .limit(8);

      setProducts((data || []).sort(() => Math.random() - 0.5).map(p => ({
        id: p.id,
        name_ar: p.name_ar,
        sku: p.sku,
        image_url: p.image_url,
        brand: p.brand as string,
      })));
    } catch (err) {
      console.error("Failed to fetch popular products:", err);
    } finally {
      setLoading(false);
    }
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
            className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all group cursor-pointer"
            onClick={() => setSelectedProduct(p)}
          >
            <div className="aspect-square bg-muted/50 relative overflow-hidden">
              <LazyImage
                src={p.image_url || "/placeholder.svg"}
                alt={p.name_ar}
                wrapperClassName="w-full h-full"
                className="w-full h-full object-contain p-2"
                optimizeWidth={300}
              />
              <Badge className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0 bg-secondary text-secondary-foreground z-10">
                {brandLabels[p.brand] || p.brand}
              </Badge>
            </div>

            <div className="p-2.5">
              <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-relaxed mb-1">
                {p.name_ar}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono mb-2">{p.sku}</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/5"
                onClick={() => onNavigateToQuotes?.()}
              >
                <Search className="w-3 h-3" />
                طلب عرض سعر
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        price={null}
        canAddToCart={!!dealerAccount?.is_active}
        isLoggedIn={!!user}
        isDealer={!!dealerAccount}
        onAddToCart={(product) => {
          addItem(product.id, 1);
          toast.success("تمت الإضافة للسلة");
          setSelectedProduct(null);
        }}
      />
    </div>
  );
};

export default DealerRecommendations;
