import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2, Package, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { pushOrderToERP } from "@/lib/erpSync";

interface FavoriteProduct {
  id: string;
  product_id: string;
  products: {
    id: string;
    name_ar: string;
    sku: string;
    base_price: number;
    image_url: string | null;
    is_on_sale: boolean;
    sale_price: number | null;
  };
}

const DealerFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToOrder, setAddingToOrder] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from("dealer_favorites")
      .select("id, product_id, products(id, name_ar, sku, base_price, image_url, is_on_sale, sale_price)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setFavorites((data as any) || []);
    setLoading(false);
  };

  const removeFavorite = async (id: string) => {
    await supabase.from("dealer_favorites").delete().eq("id", id);
    setFavorites(prev => prev.filter(f => f.id !== id));
    toast({ title: "تم الحذف", description: "تم إزالة الصنف من المفضلة" });
  };

  const quickOrder = async (product: FavoriteProduct["products"]) => {
    setAddingToOrder(product.id);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const price = product.is_on_sale && product.sale_price ? product.sale_price : product.base_price;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user!.id,
        order_number: orderNumber,
        total_amount: price,
        status: "pending",
      })
      .select()
      .single();

    if (!error && order) {
      await supabase.from("order_items").insert({
        order_id: (order as any).id,
        product_id: product.id,
        quantity: 1,
        unit_price: price,
        total_price: price,
      });
      toast({ title: "تم إرسال الطلب ✓", description: `رقم الطلب: ${orderNumber}` });
    }
    setAddingToOrder(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">المفضلة ({favorites.length})</h2>

      {favorites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد أصناف في المفضلة</p>
            <p className="text-xs text-muted-foreground/60 mt-1">الأصناف التي تطلبها كثيراً ستظهر هنا</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {favorites.map(fav => {
            const product = fav.products;
            const price = product.is_on_sale && product.sale_price ? product.sale_price : product.base_price;
            return (
              <Card key={fav.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product.name_ar}</p>
                      <p className="text-[11px] text-muted-foreground">{product.sku}</p>
                      <p className="text-sm font-bold text-primary mt-1">{price.toLocaleString("ar-EG")} ج.م</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => quickOrder(product)}
                      disabled={addingToOrder === product.id}
                    >
                      {addingToOrder === product.id ? (
                        <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-3.5 h-3.5 ml-1" />
                      )}
                      طلب سريع
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeFavorite(fav.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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

export default DealerFavorites;
