import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, Eye, ChevronDown, Lock, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { useDealerCart } from "@/hooks/useDealerCart";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

const INITIAL_COUNT = 4;
const LOAD_MORE_COUNT = 4;

interface DealerVehicleRecommendationsProps {
  vehicleTypes: string[];
  compact?: boolean;
}

const DealerVehicleRecommendations = ({ vehicleTypes, compact }: DealerVehicleRecommendationsProps) => {
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
    if (vehicleTypes.length > 0) fetchRecommendations();
  }, [vehicleTypes]);

  useEffect(() => {
    if (user) fetchDailyViews();
  }, [user]);

  const fetchDailyViews = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_daily_view_count", { _user_id: user.id });
    setDailyViewCount(data || 0);

    // Get already revealed products today
    const { data: views } = await supabase
      .from("dealer_price_views")
      .select("product_id")
      .eq("user_id", user.id)
      .eq("view_date", new Date().toISOString().split("T")[0]);

    if (views && views.length > 0) {
      const revealedIds = views.map((v) => v.product_id);
      // Fetch prices for already revealed products
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
    const keywords = vehicleTypes.flatMap((vt) => VEHICLE_KEYWORDS[vt] || []);
    if (keywords.length === 0) { setLoading(false); return; }

    const orFilter = keywords.map((kw) => `name_ar.ilike.%${kw}%`).join(",");
    const { data: bestSellingIds } = await supabase.rpc("get_best_selling_products", { _limit: 200 });

    const { data: matchingProducts } = await supabase
      .from("products")
      .select("id, name_ar, sku, image_url, base_price, stock_quantity, brand, is_on_sale, sale_price")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .or(orFilter)
      .order("stock_quantity", { ascending: false })
      .limit(100);

    if (!matchingProducts) { setLoading(false); return; }

    const bestSellingSet = new Set(bestSellingIds || []);
    const scored = matchingProducts.map((p) => ({
      ...p,
      score: (bestSellingSet.has(p.id) ? 1000 : 0) + p.stock_quantity,
    }));

    scored.sort((a, b) => b.score - a.score);
    setAllProducts(scored.slice(0, 24));
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

    // Record the view
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

        // Play cha-ching sound
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
            <Skeleton key={i} className="h-52 rounded-2xl" />
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
                className="bg-card border border-border/60 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group cursor-pointer relative"
                onClick={() => setSelectedProduct(product)}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-white relative overflow-hidden p-3">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name_ar}
                      className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground/10" />
                    </div>
                  )}

                  {/* Stock indicator */}
                  <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${
                    product.stock_quantity > 0 ? "bg-emerald-500" : "bg-red-400"
                  }`} />

                  {/* Sale badge */}
                  {product.is_on_sale && (
                    <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[8px] px-1.5 py-0 h-4 shadow-sm">
                      تخفيض
                    </Badge>
                  )}

                  {/* Revealed badge */}
                  {isRevealed && (
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-emerald-500/90 text-white text-[8px] px-1.5 py-0 h-4 gap-0.5 shadow-sm">
                        <Check className="w-2.5 h-2.5" /> مسعّر
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5 space-y-1.5">
                  <p className="text-[9px] font-mono text-muted-foreground/70 tracking-wide">{product.sku}</p>
                  <h4 className="text-[11px] font-bold text-card-foreground line-clamp-2 leading-snug min-h-[28px]">
                    {product.name_ar}
                  </h4>

                  {/* Price / Reveal Button */}
                  <div className="pt-1">
                    {isRevealed ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-baseline gap-1"
                      >
                        <span className="text-sm font-black text-primary">
                          {revealedPrices[product.id]?.toLocaleString("ar-EG")}
                        </span>
                        <span className="text-[9px] text-muted-foreground">ج.م</span>
                      </motion.div>
                    ) : (
                      <button
                        onClick={(e) => handleRevealPrice(product.id, e)}
                        disabled={limitReached || isRevealing}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                          limitReached
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary/10 text-primary hover:bg-primary/20 active:scale-95"
                        }`}
                      >
                        {isRevealing ? (
                          <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : limitReached ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        {limitReached ? "تم استنفاد الحد" : "اضغط لعرض السعر"}
                      </button>
                    )}
                  </div>
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
