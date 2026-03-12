import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, ShoppingCart, Percent } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface Product {
  id: string;
  name_ar: string;
  sku: string;
  base_price: number;
  sale_price: number | null;
  image_url: string | null;
  brand: string;
}

const DealerOffers = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name_ar, sku, base_price, sale_price, image_url, brand")
      .eq("is_active", true)
      .eq("is_on_sale", true)
      .order("created_at", { ascending: false })
      .limit(20);
    setProducts(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">العروض الحصرية</h2>

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد عروض حالياً</p>
            <p className="text-xs text-muted-foreground/60 mt-1">ترقب العروض الحصرية لعملاء الجملة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((product) => {
            const discount = product.sale_price
              ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)
              : 0;

            return (
              <Card key={product.id} className="border-border/50 overflow-hidden group">
                <div className="relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name_ar} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-muted flex items-center justify-center">
                      <Tag className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {discount > 0 && (
                    <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px]">
                      <Percent className="w-3 h-3 ml-0.5" />
                      خصم {discount}%
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-foreground truncate mb-0.5">{product.name_ar}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">{product.sku}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      {product.sale_price ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-primary">{Number(product.sale_price).toLocaleString("ar-EG")} ج.م</span>
                          <span className="text-[10px] text-muted-foreground line-through">{Number(product.base_price).toLocaleString("ar-EG")}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-foreground">{Number(product.base_price).toLocaleString("ar-EG")} ج.م</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => addItem({
                        id: product.id,
                        name: product.name_ar,
                        price: product.sale_price || product.base_price,
                        image: product.image_url || "",
                        sku: product.sku,
                      })}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerOffers;
