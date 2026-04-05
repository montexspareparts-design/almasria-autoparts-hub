import { memo, useCallback } from "react";
import { Package, Lock, Eye, ShoppingCart, Heart, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const brandRouteMap: Record<string, { label: string; color: string; path: string }> = {
  toyota_genuine: { label: "تويوتا أصلي", color: "bg-red-500/90 text-white", path: "/products/toyota-genuine" },
  toyota_oils: { label: "زيوت تويوتا", color: "bg-amber-500/90 text-white", path: "/products/toyota-oils" },
  mtx_aftermarket: { label: "MTX", color: "bg-blue-500/90 text-white", path: "/products/mtx" },
  denso: { label: "DENSO", color: "bg-emerald-600/90 text-white", path: "/products/denso" },
  aisin: { label: "AISIN", color: "bg-purple-500/90 text-white", path: "/products/aisin" },
  fbk: { label: "FBK", color: "bg-orange-500/90 text-white", path: "/products/fbk" },
};

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

const ProductCard = memo(({
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
      <div
        className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer flex group animate-fade-in"
        onClick={() => onProductClick(product)}
      >
        {/* Image */}
        <div className="w-20 sm:w-40 shrink-0 bg-white relative flex items-center justify-center p-2 sm:p-3 overflow-hidden">
          {/* Shimmer sweep on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out z-10 pointer-events-none" />
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name_ar}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/20" />
          )}
          {product.is_on_sale && (
            <Badge className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-destructive text-destructive-foreground text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0 h-4 sm:h-5">
              تخفيض
            </Badge>
          )}
          {/* Stock dot - mobile only */}
          <div className={`absolute top-1 right-1 w-2 h-2 rounded-full sm:hidden ring-1 ring-white ${
            stockAvailable ? "bg-green-500" : "bg-red-400"
          }`} />
        </div>

        {/* Content */}
        <div className="flex-1 p-2 sm:p-4 flex flex-col justify-center min-w-0 gap-1 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="text-[8px] sm:text-[10px] font-mono bg-muted text-muted-foreground px-1 sm:px-2 py-0.5 rounded leading-none">{product.sku}</span>
            <span className="hidden sm:inline"><StockBadge available={stockAvailable} /></span>
            {brandRouteMap[product.brand] && (
              <Link
                to={brandRouteMap[product.brand].path}
                className={`text-[7px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-px sm:py-0.5 rounded hover:opacity-80 transition-opacity ${brandRouteMap[product.brand].color}`}
                onClick={(e) => e.stopPropagation()}
              >
                {brandRouteMap[product.brand].label}
              </Link>
            )}
          </div>
          <h3 className="font-bold text-card-foreground text-[11px] sm:text-sm leading-snug sm:leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
            {product.name_ar}
          </h3>
          {product.product_categories && (
            <p className="text-[9px] sm:text-xs text-muted-foreground leading-none">{(product.product_categories as any).name_ar}</p>
          )}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-0.5">
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
              <Button size="sm" className="gap-1 sm:gap-1.5 text-[9px] sm:text-xs h-6 sm:h-8 px-2 sm:px-3" onClick={() => onAddToCart(product)}>
                <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />أضف
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid mode
  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden group cursor-pointer relative
        hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.12),0_8px_24px_hsl(0_0%_0%/0.08)] hover:-translate-y-1
        transition-all duration-300 ease-out animate-fade-in"
      onClick={() => onProductClick(product)}
    >
      {/* ── Image Section ── */}
      <div className="aspect-[4/3] bg-white relative overflow-hidden">
        {/* Shimmer sweep on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out z-10 pointer-events-none" />

        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name_ar}
            className="w-full h-full object-contain p-3 sm:p-4 mix-blend-multiply
              group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <Package className="w-10 h-10 text-muted-foreground/15" />
          </div>
        )}

        {/* Sale badge */}
        {product.is_on_sale && (
          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 shadow-md shadow-destructive/20 z-20">
            تخفيض
          </Badge>
        )}

        {/* Stock indicator dot */}
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full z-20 ring-2 ring-white shadow-sm ${
          stockAvailable ? "bg-green-500" : "bg-red-400"
        }`} />
      </div>

      {/* ── Content Section ── */}
      <div className="p-2.5 sm:p-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
        {/* SKU + Brand */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[8px] sm:text-[10px] font-mono text-muted-foreground/60 tracking-tight leading-none truncate">
            {product.sku}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {brandRouteMap[product.brand] && (
              <Link
                to={brandRouteMap[product.brand].path}
                className={`text-[7px] sm:text-[8px] font-bold px-1 sm:px-1.5 py-px rounded hover:opacity-80 transition-opacity ${brandRouteMap[product.brand].color}`}
                onClick={(e) => e.stopPropagation()}
              >
                {brandRouteMap[product.brand].label}
              </Link>
            )}
            <StockBadge available={stockAvailable} />
          </div>
        </div>

        {/* Name */}
        <h3 className="font-bold text-card-foreground text-[10px] sm:text-[13px] leading-snug line-clamp-2
          group-hover:text-primary transition-colors duration-200">
          {product.name_ar}
        </h3>

        {/* Category */}
        {product.product_categories && (
          <p className="text-[8px] sm:text-[10px] text-muted-foreground/70 leading-none truncate">
            {(product.product_categories as any).name_ar}
          </p>
        )}

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

        {/* Add to cart */}
        {stockAvailable && canSeePrice && (
          <Button
            size="sm"
            className="w-full gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8 rounded-lg font-semibold
              shadow-sm hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200"
            onClick={() => onAddToCart(product)}
          >
            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            أضف للسلة
          </Button>
        )}
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

/* ── Sub-components ── */

const StockBadge = ({ available }: { available: boolean }) => (
  <span className={`text-[8px] sm:text-[11px] px-1.5 sm:px-2 py-px sm:py-0.5 rounded-full font-semibold leading-none ${
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
      <Button variant="outline" size="sm" className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8" onClick={onLoginRequired}>
        <Lock className="w-3 h-3" />سجل لعرض السعر
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="w-full gap-1.5 sm:gap-2 text-[10px] sm:text-xs h-7 sm:h-8" onClick={onLoginRequired}>
        <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />سجل دخولك لعرض السعر
      </Button>
    );
  }

  if (price !== null) {
    return (
      <div className={compact ? "flex items-baseline gap-1.5" : ""}>
        <div className="text-primary font-black text-sm sm:text-lg tracking-tight leading-tight">
          {price.toLocaleString("ar-EG")} <span className="text-[10px] sm:text-xs font-bold">ج.م</span>
        </div>
        <p className={`text-[9px] sm:text-[11px] font-medium leading-none ${
          isDealer && hasViewed ? "text-green-600" : "text-muted-foreground/70"
        }`}>
          {isDealer && hasViewed ? "سعر الجملة الخاص بك" : "سعر قطاعي"}
        </p>
      </div>
    );
  }

  if (isDealer && !limitReached) {
    return compact ? (
      <Button variant="outline" size="sm" className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8" onClick={() => onRecordView(productId)}>
        <Eye className="w-3 h-3" />اعرض السعر
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="w-full gap-1.5 sm:gap-2 text-[10px] sm:text-xs h-7 sm:h-8" onClick={() => onRecordView(productId)}>
        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />اعرض السعر ({dailyLimit - dailyViewCount} متبقي)
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
