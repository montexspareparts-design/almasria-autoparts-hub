import { motion } from "framer-motion";
import { Package, Lock, Eye, ShoppingCart, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: any;
  index: number;
  viewMode: "grid" | "list";
  user: any;
  isDealer: boolean;
  viewedProductIds: string[];
  limitReached: boolean;
  dailyViewCount: number;
  dailyLimit: number;
  getProductPrice: (product: any) => number;
  onProductClick: (product: any) => void;
  onAddToCart: (product: any) => void;
  onRecordView: (productId: string) => void;
  onLoginRequired: () => void;
}

const ProductCard = ({
  product, index, viewMode, user, isDealer, viewedProductIds,
  limitReached, dailyViewCount, dailyLimit,
  getProductPrice, onProductClick, onAddToCart, onRecordView, onLoginRequired,
}: ProductCardProps) => {

  const stockAvailable = product.stock_quantity > 0;
  const hasViewed = viewedProductIds.includes(product.id);
  const canSeePrice = user && (!isDealer || hasViewed);
  const price = canSeePrice ? (isDealer ? getProductPrice(product) : product.base_price) : null;

  if (viewMode === "list") {
    return (
      <motion.div
        key={product.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.02, 0.3) }}
        className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer flex group"
        onClick={() => onProductClick(product)}
      >
        {/* Image */}
        <div className="w-28 sm:w-40 shrink-0 bg-white relative flex items-center justify-center p-3 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name_ar}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <Package className="w-10 h-10 text-muted-foreground/20" />
          )}
          {product.is_on_sale && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0 h-5">
              تخفيض
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{product.sku}</span>
            <StockBadge available={stockAvailable} />
          </div>
          <h3 className="font-bold text-card-foreground text-sm leading-relaxed mb-1 group-hover:text-primary transition-colors">
            {product.name_ar}
          </h3>
          {product.product_categories && (
            <p className="text-xs text-muted-foreground mb-2">{(product.product_categories as any).name_ar}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <PriceSection
              user={user}
              isDealer={isDealer}
              price={price}
              hasViewed={hasViewed}
              limitReached={limitReached}
              dailyViewCount={dailyViewCount}
              dailyLimit={dailyLimit}
              productId={product.id}
              onRecordView={onRecordView}
              onLoginRequired={onLoginRequired}
              compact
            />
            {stockAvailable && canSeePrice && (
              <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => onAddToCart(product)}>
                <ShoppingCart className="w-3 h-3" />أضف للسلة
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid mode
  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4), duration: 0.35 }}
      className="bg-card border border-border rounded-2xl overflow-hidden group cursor-pointer relative
        hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1.5
        transition-all duration-400 ease-out"
      onClick={() => onProductClick(product)}
    >
      {/* ── Image Section ── */}
      <div className="aspect-square bg-white relative overflow-hidden">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 z-10 pointer-events-none" />
        {/* Shimmer sweep on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out z-10 pointer-events-none" />

        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name_ar}
            className="w-full h-full object-contain p-4 mix-blend-multiply
              group-hover:scale-110 transition-transform duration-600 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <Package className="w-14 h-14 text-muted-foreground/15" />
          </div>
        )}

        {/* Sale badge */}
        {product.is_on_sale && (
          <Badge className="absolute top-2.5 left-2.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 shadow-lg shadow-destructive/20 z-20">
            تخفيض
          </Badge>
        )}

        {/* Quick view overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
          <div className="bg-foreground/80 backdrop-blur-sm text-background text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xl
            translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
            <ExternalLink className="w-3.5 h-3.5" />
            عرض التفاصيل
          </div>
        </div>

        {/* Stock indicator dot */}
        <div className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full z-20 ring-2 ring-white shadow-sm ${
          stockAvailable ? "bg-green-500" : "bg-red-400"
        }`} />
      </div>

      {/* ── Content Section ── */}
      <div className="p-3 sm:p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
        {/* SKU + Stock */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground/70 tracking-tight">
            {product.sku}
          </span>
          <StockBadge available={stockAvailable} />
        </div>

        {/* Name */}
        <h3 className="font-bold text-card-foreground text-xs sm:text-sm leading-relaxed line-clamp-2
          group-hover:text-primary transition-colors duration-200">
          {product.name_ar}
        </h3>

        {/* Category */}
        {product.product_categories && (
          <p className="text-[10px] sm:text-xs text-muted-foreground/80 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
            {(product.product_categories as any).name_ar}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-border/60 my-1" />

        {/* Price */}
        <PriceSection
          user={user}
          isDealer={isDealer}
          price={price}
          hasViewed={hasViewed}
          limitReached={limitReached}
          dailyViewCount={dailyViewCount}
          dailyLimit={dailyLimit}
          productId={product.id}
          onRecordView={onRecordView}
          onLoginRequired={onLoginRequired}
        />

        {/* Min order */}
        {product.min_order_qty > 1 && (
          <p className="text-[10px] text-muted-foreground/60">
            الحد الأدنى: {product.min_order_qty} قطعة
          </p>
        )}

        {/* Add to cart */}
        {stockAvailable && canSeePrice && (
          <Button
            size="sm"
            className="w-full gap-2 text-xs h-9 rounded-lg font-semibold
              shadow-sm hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200"
            onClick={() => onAddToCart(product)}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            أضف للسلة
          </Button>
        )}
      </div>
    </motion.div>
  );
};

/* ── Sub-components ── */

const StockBadge = ({ available }: { available: boolean }) => (
  <span className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-semibold ${
    available
      ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
      : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30"
  }`}>
    {available ? "متوفر" : "غير متوفر"}
  </span>
);

interface PriceSectionProps {
  user: any;
  isDealer: boolean;
  price: number | null;
  hasViewed: boolean;
  limitReached: boolean;
  dailyViewCount: number;
  dailyLimit: number;
  productId: string;
  onRecordView: (id: string) => void;
  onLoginRequired: () => void;
  compact?: boolean;
}

const PriceSection = ({
  user, isDealer, price, hasViewed, limitReached,
  dailyViewCount, dailyLimit, productId,
  onRecordView, onLoginRequired, compact,
}: PriceSectionProps) => {
  if (!user) {
    return compact ? (
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={onLoginRequired}>
        <Lock className="w-3 h-3" />سجل لعرض السعر
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={onLoginRequired}>
        <Lock className="w-3.5 h-3.5" />سجل دخولك لعرض السعر
      </Button>
    );
  }

  if (price !== null) {
    return (
      <div className={compact ? "flex items-baseline gap-1.5" : ""}>
        <div className="text-primary font-black text-base sm:text-lg tracking-tight">
          {price.toLocaleString("ar-EG")} <span className="text-xs font-bold">ج.م</span>
        </div>
        <p className={`text-[10px] sm:text-[11px] font-medium ${
          isDealer && hasViewed ? "text-green-600" : "text-muted-foreground/70"
        }`}>
          {isDealer && hasViewed ? "سعر الجملة الخاص بك" : "سعر قطاعي"}
        </p>
      </div>
    );
  }

  if (isDealer && !limitReached) {
    return compact ? (
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => onRecordView(productId)}>
        <Eye className="w-3 h-3" />اعرض السعر
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => onRecordView(productId)}>
        <Eye className="w-3.5 h-3.5" />اعرض السعر ({dailyLimit - dailyViewCount} متبقي)
      </Button>
    );
  }

  if (isDealer && limitReached) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
        <Lock className="w-3.5 h-3.5" />
        <span>استنفدت الحد اليومي</span>
      </div>
    );
  }

  return null;
};

export default ProductCard;
