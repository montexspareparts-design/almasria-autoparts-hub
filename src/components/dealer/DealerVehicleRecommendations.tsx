import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, Eye, ChevronDown, Lock, Check, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { useDealerCart } from "@/hooks/useDealerCart";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_COUNT = 4;
const LOAD_MORE_COUNT = 4;

interface DealerVehicleRecommendationsProps {
  compact?: boolean;
}

const DealerVehicleRecommendations = ({ compact }: DealerVehicleRecommendationsProps) => {
  const { user, isDealer, dealerAccount } = useAuth();
  const { addItem } = useDealerCart();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [revealedPrices, setRevealedPrices] = useState<Record<string, number>>({});
  const [dailyViewCount, setDailyViewCount] = useState(0);
  const [revealingId, setRevealingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  useEffect(() => {
    if (user) fetchDailyViews();
  }, [user]);

  const fetchDailyViews = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_daily_view_count", { _user_id: user.id });
    setDailyViewCount(data || 0);

    const { data: views } = await supabase
      .from("dealer_price_views")
      .select("product_id")
      .eq("user_id", user.id)
      .eq("view_date", new Date().toISOString().split("T")[0]);

    if (views && views.length > 0) {
      const revealedIds = views.map((v) => v.product_id);
      const { data: prods } = await supabase
        .from("products")
        .select("id, base_price, sale_price, is_on_sale")
        .in("id", revealedIds);

      if (prods) {
        const map: Record<string, number> = {};
        prods.forEach((p) => {
          map[p.id] = p.is_on_sale && p.sale_price ? p.sale_price : p.base_price;
        });
        setRevealedPrices(map);
      }
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    const { data: matchingProducts } = await supabase
      .from("products")
      .select("id, name_ar, sku, image_url, base_price, stock_quantity, brand, is_on_sale, sale_price")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .order("stock_quantity", { ascending: false })
      .limit(24);

    if (!matchingProducts) { setLoading(false); return; }
    const shuffled = [...matchingProducts].sort(() => Math.random() - 0.5);
    setAllProducts(shuffled.slice(0, 24));
    setLoading(false);
  };

  const handleRevealPrice = useCallback(async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || revealedPrices[productId] !== undefined) return;

    if (dailyViewCount >= 20) {
      toast.error("تم استنفاد الحد اليومي (20 صنف)");
      return;
    }

    setRevealingId(productId);
    const { error } = await supabase.from("dealer_price_views").insert({
      user_id: user.id,
      product_id: productId,
    });

    if (!error) {
      const product = allProducts.find((p) => p.id === productId);
      if (product) {
        const price = product.is_on_sale && product.sale_price ? product.sale_price : product.base_price;
        setRevealedPrices((prev) => ({ ...prev, [productId]: price }));
        setDailyViewCount((prev) => prev + 1);
        try {
          const audio = new Audio("/sounds/cha-ching.mp3");
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch {}
      }
    }
    setRevealingId(null);
  }, [user, revealedPrices, dailyViewCount, allProducts]);

  const remainingViews = 20 - dailyViewCount;
  const products = allProducts.slice(0, visibleCount);
  const hasMore = visibleCount < allProducts.length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (allProducts.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">الأكثر طلباً</h3>
            <p className="text-[10px] text-muted-foreground">تجار اشتروا هذه الأصناف</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] gap-1 ${remainingViews <= 5 ? "border-destructive/50 text-destructive" : "border-primary/30 text-primary"}`}>
          <Eye className="w-3 h-3" />
          {remainingViews} تسعير متبقي
        </Badge>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {products.map((product, index) => {
            const isRevealed = revealedPrices[product.id] !== undefined;
            const isRevealing = revealingId === product.id;
            const limitReached = dailyViewCount >= 20;

            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index < INITIAL_COUNT ? index * 0.05 : 0, duration: 0.3 }}
                className="bg-card rounded-2xl overflow-hidden group cursor-pointer relative
                  border border-border/40
                  hover:border-primary/30 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.08),0_4px_12px_hsl(0_0%_0%/0.06)]
                  hover:-translate-y-0.5
                  transition-all duration-300 ease-out"
                onClick={() => setSelectedProduct(product)}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-gradient-to-br from-white via-white to-muted/10 relative overflow-hidden">
                  {/* Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out z-10 pointer-events-none" />

                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name_ar}
                      className="w-full h-full object-contain p-4 mix-blend-multiply group-hover:scale-[1.06] transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/10" />
                    </div>
                  )}

                  {/* Stock dot */}
                  <div className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ring-[1.5px] ring-white shadow-sm z-20 ${
                    product.stock_quantity > 0 ? "bg-green-500" : "bg-red-400"
                  }`} />

                  {/* Sale badge */}
                  {product.is_on_sale && (
                    <Badge className="absolute top-2.5 left-2.5 bg-destructive text-destructive-foreground text-[8px] font-bold px-2 py-0.5 shadow-lg shadow-destructive/25 z-20 rounded-md">
                      تخفيض
                    </Badge>
                  )}

                  {/* Priced badge */}
                  {isRevealed && (
                    <div className="absolute bottom-2 left-2 z-20">
                      <span className="inline-flex items-center gap-0.5 bg-green-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                        <Check className="w-2.5 h-2.5" /> مسعّر
                      </span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-border/40" />

                {/* Info */}
                <div className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {/* SKU */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-md font-semibold leading-none ${
                      product.stock_quantity > 0
                        ? "text-green-700 bg-green-50/80 dark:text-green-400 dark:bg-green-950/30"
                        : "text-red-600 bg-red-50/80 dark:text-red-400 dark:bg-red-950/30"
                    }`}>
                      {product.stock_quantity > 0 ? "متوفر" : "غير متوفر"}
                    </span>
                    <span className="text-[8px] font-mono text-muted-foreground/50 tracking-wider">{product.sku}</span>
                  </div>

                  {/* Name */}
                  <h4 className="text-[11px] font-bold text-card-foreground line-clamp-2 leading-snug min-h-[2.5em] group-hover:text-primary transition-colors duration-200">
                    {product.name_ar}
                  </h4>

                  {/* Price / Reveal Button */}
                  <div className="pt-0.5">
                    {isRevealed ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="space-y-0.5"
                      >
                        <div className="text-primary font-black text-base tracking-tight leading-tight">
                          {revealedPrices[product.id]?.toLocaleString("ar-EG")} <span className="text-[10px] font-bold text-primary/70">ج.م</span>
                        </div>
                        <p className="text-[8px] font-medium text-green-600 dark:text-green-400">✓ سعر الجملة الخاص بك</p>
                      </motion.div>
                    ) : (
                      <button
                        onClick={(e) => handleRevealPrice(product.id, e)}
                        disabled={limitReached || isRevealing}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all duration-200 ${
                          limitReached
                            ? "bg-muted/30 text-muted-foreground/60 cursor-not-allowed"
                            : "bg-primary/8 text-primary border border-primary/15 hover:bg-primary/15 hover:border-primary/25 active:scale-[0.98]"
                        }`}
                      >
                        {isRevealing ? (
                          <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : limitReached ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>{limitReached ? "استنفدت الحد اليومي" : "اعرض السعر"}</span>
                        {!limitReached && (
                          <span className="text-primary/50 text-[9px]">({remainingViews} متبقي)</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Add to cart for revealed */}
                  {isRevealed && dealerAccount?.is_active && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-[10px] h-8 rounded-xl font-bold
                        shadow-sm hover:shadow-md hover:shadow-primary/15 active:scale-[0.98] transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(product.id, 1);
                        toast.success("تمت الإضافة للسلة");
                      }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      أضف للسلة
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show More Button */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center pt-1"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
            className="rounded-xl gap-1.5 text-xs font-bold border-border/60 hover:border-primary/30 hover:bg-primary/5 px-6"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            عرض المزيد ({allProducts.length - visibleCount} صنف)
          </Button>
        </motion.div>
      )}

      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        price={selectedProduct && revealedPrices[selectedProduct.id] !== undefined ? revealedPrices[selectedProduct.id] : null}
        canAddToCart={!!dealerAccount?.is_active && selectedProduct && revealedPrices[selectedProduct.id] !== undefined}
        isLoggedIn={!!user}
        isDealer={!!dealerAccount}
        onRevealPrice={(productId) => {
          handleRevealPrice(productId, { stopPropagation: () => {} } as any);
        }}
        remainingViews={remainingViews}
        limitReached={dailyViewCount >= 20}
        onAddToCart={(product) => {
          addItem(product.id, 1);
          toast.success("تمت الإضافة للسلة");
          setSelectedProduct(null);
        }}
      />
    </div>
  );
};

export default DealerVehicleRecommendations;
